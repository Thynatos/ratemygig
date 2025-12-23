import type {
    IEventsProvider,
    SearchEventsParams,
    SearchEventsResult,
    ProviderEvent
} from '@core/index'
import mockData from '@/../../../packages/db/seed/mock-events.json'

interface MockVenue {
    id: string
    name: string
    city: string
    country: string
    lat?: number
    lng?: number
}

interface MockArtist {
    id: string
    name: string
}

interface MockEvent {
    id: string
    name: string
    startAt: string
    venueId: string
    artistIds: string[]
    ticketUrls: { label: string; url: string }[]
}

export class MockEventsProvider implements IEventsProvider {
    readonly providerId = 'mock'

    private venues: Map<string, MockVenue>
    private artists: Map<string, MockArtist>
    private events: MockEvent[]

    constructor() {
        this.venues = new Map(mockData.venues.map(v => [v.id, v]))
        this.artists = new Map(mockData.artists.map(a => [a.id, a]))
        this.events = mockData.events
    }

    async searchEvents(params: SearchEventsParams): Promise<SearchEventsResult> {
        const { city, from, to, query, page = 1, pageSize = 10 } = params

        let filtered = this.events.filter(event => {
            const venue = this.venues.get(event.venueId)
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
                    const artist = this.artists.get(id)
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
        const events: ProviderEvent[] = paginated.map(event => this.mapToProviderEvent(event))

        return {
            events,
            totalCount: filtered.length,
            page,
            pageSize,
            hasMore: end < filtered.length,
        }
    }

    async getEvent(providerEventId: string): Promise<ProviderEvent | null> {
        const event = this.events.find(e => e.id === providerEventId)
        if (!event) return null
        return this.mapToProviderEvent(event)
    }

    private mapToProviderEvent(event: MockEvent): ProviderEvent {
        const venue = this.venues.get(event.venueId)!
        const artists = event.artistIds
            .map(id => this.artists.get(id))
            .filter((a): a is MockArtist => !!a)
            .map(a => ({ id: a.id, name: a.name }))

        return {
            id: event.id,
            name: event.name,
            startAt: new Date(event.startAt),
            venue: {
                id: venue.id,
                name: venue.name,
                city: venue.city,
                country: venue.country,
                lat: venue.lat,
                lng: venue.lng,
            },
            artists,
            ticketUrls: event.ticketUrls,
        }
    }

    getCities(): string[] {
        const cities = new Set<string>()
        this.venues.forEach(venue => cities.add(venue.city))
        return Array.from(cities).sort()
    }
}

// Singleton instance
export const mockEventsProvider = new MockEventsProvider()
