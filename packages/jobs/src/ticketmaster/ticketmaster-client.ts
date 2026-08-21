// Ticketmaster Discovery API Client
// Handles API calls with rate limiting and error handling

import type {
    TmEventSearchParams,
    TmVenueSearchParams,
    TmAttractionSearchParams,
    TmEventsResponse,
    TmVenuesResponse,
    TmAttractionsResponse,
    TmEvent,
    TmVenue,
    TmAttraction,
} from './types.js';

export class TicketmasterClient {
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_BASE_DELAY_MS = 1000;

    private apiKey: string;
    private baseUrl: string;
    private rateLimit: number;
    private lastRequestTime: number = 0;
    private requestQueue: Promise<void> = Promise.resolve();

    constructor(apiKey: string, baseUrl: string = 'https://app.ticketmaster.com/discovery/v2', rateLimit: number = 5) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.rateLimit = rateLimit;
    }

    // ============================================
    // Rate Limiting
    // ============================================

    private async throttle(): Promise<void> {
        const minInterval = 1000 / this.rateLimit;  // ms between requests
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < minInterval) {
            const waitTime = minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    private async queuedRequest<T>(request: () => Promise<T>): Promise<T> {
        // Queue requests to ensure rate limiting
        const result = this.requestQueue.then(async () => {
            await this.throttle();
            return request();
        });

        this.requestQueue = result.then(() => { }, () => { });
        return result;
    }

    // ============================================
    // HTTP Helpers
    // ============================================

    private buildUrl(endpoint: string, params: Record<string, string | number | undefined>): string {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.set('apikey', this.apiKey);

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        }

        return url.toString();
    }

    private async fetch<T>(endpoint: string, params: Record<string, string | number | undefined>): Promise<T> {
        return this.queuedRequest(async () => {
            const url = this.buildUrl(endpoint, params);

            let attempt = 0;
            while (true) {
                attempt++;
                const response = await fetch(url);

                if (response.ok) {
                    return response.json() as Promise<T>;
                }

                const status = response.status;
                const errorText = await response.text();
                const retryable = status === 429 || status >= 500;

                if (!retryable || attempt > TicketmasterClient.MAX_RETRIES) {
                    throw new Error(`Ticketmaster API error ${status}: ${errorText}`);
                }

                // Exponential backoff; honour Retry-After for 429s when present
                const retryAfterSeconds = Number(response.headers.get('retry-after'));
                const delayMs =
                    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
                        ? retryAfterSeconds * 1000
                        : TicketmasterClient.RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);

                console.warn(
                    `Ticketmaster API ${status}, retrying in ${delayMs}ms ` +
                    `(attempt ${attempt}/${TicketmasterClient.MAX_RETRIES})`
                );
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        });
    }

    // ============================================
    // Event Endpoints
    // ============================================

    async searchEvents(params: TmEventSearchParams): Promise<TmEventsResponse> {
        return this.fetch<TmEventsResponse>('/events.json', {
            keyword: params.keyword,
            attractionId: params.attractionId,
            venueId: params.venueId,
            city: params.city,
            countryCode: params.countryCode,
            stateCode: params.stateCode,
            classificationName: params.classificationName,
            classificationId: params.classificationId,
            startDateTime: params.startDateTime,
            endDateTime: params.endDateTime,
            size: params.size || 200,
            page: params.page || 0,
            sort: params.sort || 'date,asc',
            includeTest: params.includeTest || 'no',
            source: params.source,
        });
    }

    async getEvent(eventId: string): Promise<TmEvent | null> {
        try {
            return await this.fetch<TmEvent>(`/events/${eventId}.json`, {});
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Fetch all events with pagination
     * Note: Ticketmaster limits deep paging to 1000 items (size * page < 1000)
     */
    async *searchEventsAll(params: TmEventSearchParams): AsyncGenerator<TmEvent[], void, unknown> {
        let page = 0;
        const size = params.size || 200;
        const maxPage = Math.floor(1000 / size) - 1;  // Stay under 1000 item limit

        while (true) {
            const response = await this.searchEvents({ ...params, page, size });
            const events = response._embedded?.events || [];

            if (events.length === 0) {
                break;
            }

            yield events;

            const pageInfo = response.page;
            if (!pageInfo || page >= pageInfo.totalPages - 1) {
                break;
            }

            if (page >= maxPage) {
                console.warn(
                    `Ticketmaster pagination cap reached: stopping at page ${page} ` +
                    `(${(maxPage + 1) * size} items); further results are truncated by the API's ` +
                    `1000-item deep-paging limit.`
                );
                break;
            }

            page++;
        }
    }

    // ============================================
    // Venue Endpoints
    // ============================================

    async searchVenues(params: TmVenueSearchParams): Promise<TmVenuesResponse> {
        return this.fetch<TmVenuesResponse>('/venues.json', {
            keyword: params.keyword,
            city: params.city,
            countryCode: params.countryCode,
            stateCode: params.stateCode,
            size: params.size || 200,
            page: params.page || 0,
        });
    }

    async getVenue(venueId: string): Promise<TmVenue | null> {
        try {
            return await this.fetch<TmVenue>(`/venues/${venueId}.json`, {});
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    // ============================================
    // Attraction Endpoints
    // ============================================

    async searchAttractions(params: TmAttractionSearchParams): Promise<TmAttractionsResponse> {
        return this.fetch<TmAttractionsResponse>('/attractions.json', {
            keyword: params.keyword,
            classificationName: params.classificationName,
            classificationId: params.classificationId,
            size: params.size || 200,
            page: params.page || 0,
        });
    }

    async getAttraction(attractionId: string): Promise<TmAttraction | null> {
        try {
            return await this.fetch<TmAttraction>(`/attractions/${attractionId}.json`, {});
        } catch (error) {
            if (error instanceof Error && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }
}
