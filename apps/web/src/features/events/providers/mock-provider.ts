import type {
    IEventsProvider,
    SearchEventsParams,
    SearchEventsResult,
    ProviderEvent
} from '@core/index'
import {
    getMockArtistRecord,
    getMockCities,
    getMockEventRecord,
    getMockVenueRecord,
    mapMockEventToProviderEvent,
    mockEvents,
} from './mock-catalog'
import { PAGE_SIZES } from '@/shared/lib/constants'

export class MockEventsProvider implements IEventsProvider {
    readonly providerId = 'mock'

    async searchEvents(params: SearchEventsParams): Promise<SearchEventsResult> {
        const { city, from, to, query, page = 1, pageSize = PAGE_SIZES.MOCK_DEFAULT } = params

        const filtered = mockEvents.filter(event => {
            const venue = getMockVenueRecord(event.venueId)
            if (!venue) return false

            // Filter by city
            if (city && venue.city.toLowerCase() !== city.toLowerCase()) {
                return false
            }

            // Filter by date range
            const eventDate = new Date(event.startAt)
            if (from && eventDate < from) return false
            if (to && eventDate > to) return false

            // Filter by search query (artist or event name)
            if (query) {
                const q = query.toLowerCase()
                const matchesName = event.name.toLowerCase().includes(q)
                const matchesArtist = event.artistIds.some(id => {
                    const artist = getMockArtistRecord(id)
                    return artist?.name.toLowerCase().includes(q)
                })
                const matchesVenue = venue.name.toLowerCase().includes(q)
                if (!matchesName && !matchesArtist && !matchesVenue) return false
            }

            return true
        })

        // Sort by date
        filtered.sort((a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        )

        // Paginate
        const start = (page - 1) * pageSize
        const end = start + pageSize
        const paginated = filtered.slice(start, end)

        // Map to ProviderEvent format
        const events: ProviderEvent[] = paginated.map(mapMockEventToProviderEvent)

        return {
            events,
            totalCount: filtered.length,
            page,
            pageSize,
            hasMore: end < filtered.length,
        }
    }

    async getEvent(providerEventId: string): Promise<ProviderEvent | null> {
        const event = getMockEventRecord(providerEventId)
        if (!event) return null
        return mapMockEventToProviderEvent(event)
    }

    getCities(): string[] {
        return getMockCities()
    }
}

// Singleton instance
export const mockEventsProvider = new MockEventsProvider()
