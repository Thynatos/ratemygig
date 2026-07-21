// Ticketmaster Events Provider
// Implements IEventsProvider interface using Ticketmaster Discovery API

import { TicketmasterClient } from './ticketmaster-client.js';
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

        // Get best image
        const image = this.getBestImage(tmEvent.images);

        // Map artists (attractions)
        const artists: ProviderArtist[] = (tmEvent._embedded?.attractions || []).map(attr => ({
            id: attr.id,
            name: attr.name,
            imageUrl: this.getBestImage(attr.images),
        }));

        // Build ticket URLs
        const ticketUrls: TicketUrl[] = [];
        if (tmEvent.url) {
            ticketUrls.push({ label: 'Ticketmaster', url: tmEvent.url });
        }

        return {
            id: tmEvent.id,
            name: tmEvent.name,
            startAt: new Date(dateStr),
            venue: {
                id: venue.id,
                name: venue.name,
                city: venue.city?.name || 'Unknown',
                country: venue.country?.countryCode || venue.country?.name || 'Unknown',
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
            startDateTime: params.from?.toISOString().replace('.000Z', 'Z'),
            endDateTime: params.to?.toISOString().replace('.000Z', 'Z'),
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
            startDateTime: params?.from?.toISOString().replace('.000Z', 'Z'),
            endDateTime: params?.to?.toISOString().replace('.000Z', 'Z'),
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
            startDateTime: params?.from?.toISOString().replace('.000Z', 'Z'),
            endDateTime: params?.to?.toISOString().replace('.000Z', 'Z'),
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
     * Fetch all events matching criteria (for daily ingestion)
     * Uses pagination to get as many events as possible.
     * When `cities` is provided, fetches per city instead of per country
     * (Ticketmaster caps deep paging at 1000 items per query, so
     * city-scoped queries truncate less than country-wide ones).
     */
    async *fetchAllEvents(params: {
        countries: string[];
        cities?: string[];
        from: Date;
        to: Date;
    }): AsyncGenerator<ProviderEvent[], void, unknown> {
        const dateParams = {
            classificationName: this.classification,
            startDateTime: params.from.toISOString().replace('.000Z', 'Z'),
            endDateTime: params.to.toISOString().replace('.000Z', 'Z'),
        };

        if (params.cities && params.cities.length > 0) {
            for (const city of params.cities) {
                console.log(`Fetching events for city: ${city}`);
                yield* this.fetchBatches({ ...dateParams, city });
            }
            return;
        }

        for (const country of params.countries) {
            console.log(`Fetching events for country: ${country}`);
            yield* this.fetchBatches({ ...dateParams, countryCode: country });
        }
    }

    private async *fetchBatches(searchParams: TmEventSearchParams): AsyncGenerator<ProviderEvent[], void, unknown> {
        for await (const batch of this.client.searchEventsAll(searchParams)) {
            const events = batch
                .map(e => this.mapEvent(e))
                .filter((e): e is ProviderEvent => e !== null);

            if (events.length > 0) {
                yield events;
            }
        }
    }
}
