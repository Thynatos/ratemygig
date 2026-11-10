// Ticketmaster Events Provider
// Implements IEventsProvider interface using Ticketmaster Discovery API

import { TicketmasterClient } from './ticketmaster-client.js';
import { toTicketmasterDateTime } from './datetime.js';
import type { TmEvent, TmEventSearchParams } from './types.js';

// Provider-specific types (matching core/interfaces/events-provider.ts)
export interface ProviderVenue {
    id: string;
    name: string;
    city: string;
    country: string;
    lat?: number;
    lng?: number;
}

export interface ProviderArtist {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface TicketUrl {
    label: string;
    url: string;
}

export interface ProviderEvent {
    id: string;
    name: string;
    startAt: Date;
    venue: ProviderVenue;
    artists: ProviderArtist[];
    ticketUrls: TicketUrl[];
    imageUrl?: string;
}

export interface SearchEventsParams {
    city?: string;
    country?: string;
    from?: Date;
    to?: Date;
    query?: string;
    page?: number;
    pageSize?: number;
}

export interface SearchEventsResult {
    events: ProviderEvent[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

// Ticketmaster serves only the first 1,000 results of any search
// (size * page < 1000), so the ingest splits date ranges that match more
const RESULT_CAP = 1000;
const PAGE_SIZE = 200;
// A window this short that still matches more than RESULT_CAP events is
// fetched truncated rather than split again, so the splitting always ends
const MIN_WINDOW_MS = 60 * 60 * 1000;

// Ticketmaster pads some values ("Brooklyn ") and omits others entirely, which
// would otherwise create duplicate venues or violate NOT NULL columns
function clean(value: string | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
}

export class TicketmasterProvider {
    readonly providerId = 'ticketmaster';
    private client: TicketmasterClient;
    private classification: string;

    constructor(client: TicketmasterClient, classification: string = 'music') {
        this.client = client;
        this.classification = classification;
    }

    // ============================================
    // Data Mapping
    // ============================================

    private mapEvent(tmEvent: TmEvent): ProviderEvent | null {
        const venue = tmEvent._embedded?.venues?.[0];
        if (!venue) {
            return null;  // Skip events without venue
        }

        // Parse date
        const dateStr = tmEvent.dates?.start?.dateTime || tmEvent.dates?.start?.localDate;
        if (!dateStr) {
            return null;  // Skip events without date
        }

        // events.name and venues.name are NOT NULL
        const name = clean(tmEvent.name);
        const venueName = clean(venue.name);
        if (!name || !venueName) {
            return null;  // Skip events without a usable name
        }

        // Get best image
        const image = this.getBestImage(tmEvent.images);

        // Map artists (attractions); artists.name is NOT NULL, so nameless ones are dropped
        const artists: ProviderArtist[] = [];
        for (const attr of tmEvent._embedded?.attractions || []) {
            const artistName = clean(attr.name);
            if (artistName) {
                artists.push({
                    id: attr.id,
                    name: artistName,
                    imageUrl: this.getBestImage(attr.images),
                });
            }
        }

        // Build ticket URLs
        const ticketUrls: TicketUrl[] = [];
        if (tmEvent.url) {
            ticketUrls.push({ label: 'Ticketmaster', url: tmEvent.url });
        }

        return {
            id: tmEvent.id,
            name,
            startAt: new Date(dateStr),
            venue: {
                id: venue.id,
                name: venueName,
                city: clean(venue.city?.name) || 'Unknown',
                country: clean(venue.country?.countryCode) || clean(venue.country?.name) || 'Unknown',
                lat: venue.location?.latitude ? parseFloat(venue.location.latitude) : undefined,
                lng: venue.location?.longitude ? parseFloat(venue.location.longitude) : undefined,
            },
            artists,
            ticketUrls,
            imageUrl: image,
        };
    }

    private getBestImage(images?: { url: string; width?: number; height?: number }[]): string | undefined {
        if (!images || images.length === 0) return undefined;

        // Prefer larger images, 16:9 ratio
        const sorted = [...images].sort((a, b) => {
            const aSize = (a.width || 0) * (a.height || 0);
            const bSize = (b.width || 0) * (b.height || 0);
            return bSize - aSize;
        });

        return sorted[0]?.url;
    }

    // ============================================
    // IEventsProvider Implementation
    // ============================================

    async searchEvents(params: SearchEventsParams): Promise<SearchEventsResult> {
        const tmParams: TmEventSearchParams = {
            keyword: params.query,
            city: params.city,
            countryCode: params.country,
            classificationName: this.classification,
            startDateTime: toTicketmasterDateTime(params.from),
            endDateTime: toTicketmasterDateTime(params.to),
            size: params.pageSize || 20,
            page: (params.page || 1) - 1,  // API uses 0-based pages
        };

        const response = await this.client.searchEvents(tmParams);
        const tmEvents = response._embedded?.events || [];

        const events = tmEvents
            .map(e => this.mapEvent(e))
            .filter((e): e is ProviderEvent => e !== null);

        return {
            events,
            totalCount: response.page?.totalElements || 0,
            page: params.page || 1,
            pageSize: params.pageSize || 20,
            hasMore: (response.page?.number || 0) < (response.page?.totalPages || 0) - 1,
        };
    }

    async getEvent(providerEventId: string): Promise<ProviderEvent | null> {
        const tmEvent = await this.client.getEvent(providerEventId);
        if (!tmEvent) return null;
        return this.mapEvent(tmEvent);
    }

    async getVenueEvents(venueId: string, params?: { from?: Date; to?: Date }): Promise<ProviderEvent[]> {
        const response = await this.client.searchEvents({
            venueId,
            classificationName: this.classification,
            startDateTime: toTicketmasterDateTime(params?.from),
            endDateTime: toTicketmasterDateTime(params?.to),
            size: 200,
        });

        return (response._embedded?.events || [])
            .map(e => this.mapEvent(e))
            .filter((e): e is ProviderEvent => e !== null);
    }

    async getArtistEvents(attractionId: string, params?: { from?: Date; to?: Date }): Promise<ProviderEvent[]> {
        const response = await this.client.searchEvents({
            attractionId,
            classificationName: this.classification,
            startDateTime: toTicketmasterDateTime(params?.from),
            endDateTime: toTicketmasterDateTime(params?.to),
            size: 200,
        });

        return (response._embedded?.events || [])
            .map(e => this.mapEvent(e))
            .filter((e): e is ProviderEvent => e !== null);
    }

    // ============================================
    // Bulk Fetch for Ingestion
    // ============================================

    /**
     * Fetch all events matching criteria (for daily ingestion).
     * Areas are Ticketmaster DMAs (metro areas, suburbs included) and city
     * names. Each area's date range is split into windows small enough that
     * Ticketmaster's 1,000-result cap never truncates them.
     * With no areas set, each country is a single query, which the cap cuts
     * off after its first 1,000 events. Splitting a whole country would pull
     * tens of thousands of events a night, so full coverage is opt-in per area.
     * An event returned by more than one area or window is yielded once.
     */
    async *fetchAllEvents(params: {
        countries: string[];
        cities?: string[];
        dmaIds?: string[];
        from: Date;
        to: Date;
    }): AsyncGenerator<ProviderEvent[], void, unknown> {
        const seen = new Set<string>();
        const areas = [
            ...(params.dmaIds ?? []).map(dmaId => ({ label: `DMA ${dmaId}`, search: { dmaId } })),
            ...(params.cities ?? []).map(city => ({ label: `city ${city}`, search: { city } })),
        ];

        if (areas.length > 0) {
            for (const area of areas) {
                console.log(`Fetching events for ${area.label}`);
                const windows = this.searchWindows(
                    { ...area.search, classificationName: this.classification },
                    params.from,
                    params.to
                );
                let count = 0;
                for await (const events of this.fetchBatches(windows, seen)) {
                    count += events.length;
                    yield events;
                }
                console.log(`  ${area.label}: ${count} events`);
            }
            return;
        }

        for (const country of params.countries) {
            console.log(`Fetching events for country: ${country}`);
            yield* this.fetchBatches(this.client.searchEventsAll({
                countryCode: country,
                classificationName: this.classification,
                startDateTime: toTicketmasterDateTime(params.from),
                endDateTime: toTicketmasterDateTime(params.to),
            }), seen);
        }
    }

    /**
     * Page through one area's events from `from` to `to`, halving the range
     * until each piece matches no more events than the paging cap lets through.
     * A range is only split after its first page shows it is too big, so an
     * area that fits costs no extra requests.
     */
    private async *searchWindows(
        search: TmEventSearchParams,
        from: Date,
        to: Date
    ): AsyncGenerator<TmEvent[], void, unknown> {
        const params: TmEventSearchParams = {
            ...search,
            startDateTime: toTicketmasterDateTime(from),
            endDateTime: toTicketmasterDateTime(to),
            size: PAGE_SIZE,
        };
        const firstPage = await this.client.searchEvents({ ...params, page: 0 });
        const total = firstPage.page?.totalElements ?? 0;

        if (total > RESULT_CAP && to.getTime() - from.getTime() > MIN_WINDOW_MS) {
            // Whole seconds, as Ticketmaster rejects milliseconds. Both halves
            // include the midpoint, so an event starting exactly then can't
            // slip between them; fetchAllEvents drops the second copy.
            const mid = new Date(Math.floor((from.getTime() + to.getTime()) / 2000) * 1000);
            console.log(`  ${params.startDateTime} to ${params.endDateTime} has ${total} events; splitting at ${toTicketmasterDateTime(mid)}`);
            yield* this.searchWindows(search, from, mid);
            yield* this.searchWindows(search, mid, to);
            return;
        }

        yield* this.client.searchEventsAll(params, firstPage);
    }

    private async *fetchBatches(
        batches: AsyncIterable<TmEvent[]>,
        seen: Set<string>
    ): AsyncGenerator<ProviderEvent[], void, unknown> {
        for await (const batch of batches) {
            const events: ProviderEvent[] = [];
            for (const tmEvent of batch) {
                if (seen.has(tmEvent.id)) continue;
                seen.add(tmEvent.id);

                const event = this.mapEvent(tmEvent);
                if (event) events.push(event);
            }

            if (events.length > 0) {
                yield events;
            }
        }
    }
}
