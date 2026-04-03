import type {
    IEventsProvider,
    SearchEventsParams,
    SearchEventsResult,
    ProviderEvent,
} from '@core/index'
import { TicketmasterClient } from '@jobs/ticketmaster/ticketmaster-client'
import { TicketmasterProvider } from '@jobs/ticketmaster/ticketmaster-provider'

/**
 * Ticketmaster Discovery API in the browser (uses VITE_TICKETMASTER_API_KEY).
 * Used when the DB has no rows yet or for live search alongside ingestion.
 */
export function createTicketmasterBrowserProvider(apiKey: string): IEventsProvider {
    const inner = new TicketmasterProvider(new TicketmasterClient(apiKey))

    return {
        providerId: 'ticketmaster',
        searchEvents(params: SearchEventsParams): Promise<SearchEventsResult> {
            return inner.searchEvents({
                city: params.city,
                country: params.country,
                from: params.from,
                to: params.to,
                query: params.query,
                page: params.page,
                pageSize: params.pageSize,
            })
        },
        getEvent(providerEventId: string): Promise<ProviderEvent | null> {
            return inner.getEvent(providerEventId)
        },
        getVenueEvents(venueId: string, p) {
            return inner.getVenueEvents?.(venueId, p) ?? Promise.resolve([])
        },
        getArtistEvents(artistId: string, p) {
            return inner.getArtistEvents?.(artistId, p) ?? Promise.resolve([])
        },
    }
}
