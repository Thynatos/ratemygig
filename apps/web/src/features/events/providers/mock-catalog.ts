import type { Artist, Event, ProviderEvent, TicketUrl, Venue } from '@core/index'
import mockData from '@/../../../packages/db/seed/mock-events.json'

export interface MockVenueRecord {
    id: string
    name: string
    city: string
    country: string
    lat?: number
    lng?: number
}

export interface MockArtistRecord {
    id: string
    name: string
}

export interface MockEventRecord {
    id: string
    name: string
    startAt: string
    venueId: string
    artistIds: string[]
    ticketUrls: TicketUrl[]
}

export const mockVenues = mockData.venues as MockVenueRecord[]
export const mockArtists = mockData.artists as MockArtistRecord[]
export const mockEvents = mockData.events as MockEventRecord[]

const mockVenueById = new Map(mockVenues.map(venue => [venue.id, venue]))
const mockArtistById = new Map(mockArtists.map(artist => [artist.id, artist]))

function createMockTimestamp(): string {
    return new Date().toISOString()
}

export function getMockVenueRecord(venueId: string): MockVenueRecord | undefined {
    return mockVenueById.get(venueId)
}

export function getMockArtistRecord(artistId: string): MockArtistRecord | undefined {
    return mockArtistById.get(artistId)
}

export function getMockEventRecord(eventId: string): MockEventRecord | undefined {
    return mockEvents.find(event => event.id === eventId)
}

export function mapMockVenueToVenue(venue: MockVenueRecord, createdAt = createMockTimestamp()): Venue {
    return {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        country: venue.country,
        lat: venue.lat ?? null,
        lng: venue.lng ?? null,
        provider_venue_id: null,
        created_at: createdAt,
    }
}

export function mapMockArtistToArtist(artist: MockArtistRecord, createdAt = createMockTimestamp()): Artist {
    return {
        id: artist.id,
        name: artist.name,
        provider_artist_id: artist.id,
        created_at: createdAt,
    }
}

export function mapMockEventToProviderEvent(event: MockEventRecord): ProviderEvent {
    const venue = getMockVenueRecord(event.venueId)
    const artists = event.artistIds
        .map(getMockArtistRecord)
        .filter((artist): artist is MockArtistRecord => Boolean(artist))
        .map(artist => ({ id: artist.id, name: artist.name }))

    return {
        id: event.id,
        name: event.name,
        startAt: new Date(event.startAt),
        venue: {
            id: venue?.id || event.venueId,
            name: venue?.name || 'Unknown Venue',
            city: venue?.city || '',
            country: venue?.country || '',
            lat: venue?.lat,
            lng: venue?.lng,
        },
        artists,
        ticketUrls: event.ticketUrls,
    }
}

export function mapMockEventToEvent(event: MockEventRecord, createdAt = createMockTimestamp()): Event {
    const venue = getMockVenueRecord(event.venueId)

    return {
        id: event.id,
        provider: 'mock',
        provider_event_id: event.id,
        name: event.name,
        start_at: event.startAt,
        city: venue?.city || '',
        country: venue?.country || '',
        venue_id: event.venueId,
        venue: venue ? mapMockVenueToVenue(venue, createdAt) : undefined,
        ticket_urls: event.ticketUrls,
        lineup: event.artistIds
            .map(artistId => getMockArtistRecord(artistId)?.name)
            .filter((artistName): artistName is string => Boolean(artistName)),
        created_at: createdAt,
        updated_at: createdAt,
    }
}

export function getMockArtists(search?: string): Artist[] {
    const createdAt = createMockTimestamp()
    const normalizedQuery = search?.trim().toLowerCase()

    return mockArtists
        .filter(artist => !normalizedQuery || artist.name.toLowerCase().includes(normalizedQuery))
        .map(artist => mapMockArtistToArtist(artist, createdAt))
}

export function getMockArtist(artistId: string): Artist | null {
    const artist = getMockArtistRecord(artistId)
    return artist ? mapMockArtistToArtist(artist) : null
}

export function getMockVenues(city?: string): Venue[] {
    const createdAt = createMockTimestamp()
    const normalizedCity = city?.trim().toLowerCase()

    return mockVenues
        .filter(venue => !normalizedCity || venue.city.toLowerCase() === normalizedCity)
        .map(venue => mapMockVenueToVenue(venue, createdAt))
}

export function getMockVenue(venueId: string): Venue | null {
    const venue = getMockVenueRecord(venueId)
    return venue ? mapMockVenueToVenue(venue) : null
}

export function getMockEventsByArtistId(artistId: string): Event[] {
    const createdAt = createMockTimestamp()

    return mockEvents
        .filter(event => event.artistIds.includes(artistId))
        .map(event => mapMockEventToEvent(event, createdAt))
}

export function getMockEventsByVenueId(venueId: string): Event[] {
    const createdAt = createMockTimestamp()

    return mockEvents
        .filter(event => event.venueId === venueId)
        .map(event => mapMockEventToEvent(event, createdAt))
}

export function getMockCities(): string[] {
    return [...new Set(mockVenues.map(venue => venue.city))].sort((left, right) => left.localeCompare(right))
}
