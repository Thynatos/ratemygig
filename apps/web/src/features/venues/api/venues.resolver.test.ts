import { describe, expect, it, vi } from 'vitest'
import { resolveVenueEventsWithDeps, resolveVenueWithDeps, resolveVenuesWithDeps } from './venues'

describe('venue resolver policy', () => {
    it('does not fall back to mock venues in ticketmaster mode', async () => {
        const fetchFromMock = vi.fn().mockResolvedValue([{ id: 'mock-venue' }])

        const result = await resolveVenuesWithDeps('London', {
            mode: 'ticketmaster',
            supabaseConfigured: true,
            fetchFromDatabase: vi.fn().mockResolvedValue({ data: [], hasMore: false }),
            fetchFromMock,
        })

        expect(result).toEqual({ data: [], hasMore: false })
        expect(fetchFromMock).not.toHaveBeenCalled()
    })

    it('falls back to mock venue details in mock mode', async () => {
        const mockVenue = {
            id: 'venue-1',
            name: 'Madison Square Garden',
            city: 'New York',
            country: 'USA',
            lat: null,
            lng: null,
            provider_venue_id: null,
            created_at: 'now',
        }

        const result = await resolveVenueWithDeps('venue-1', {
            mode: 'mock',
            supabaseConfigured: true,
            fetchFromDatabase: vi.fn().mockResolvedValue(null),
            fetchFromMock: vi.fn().mockResolvedValue(mockVenue),
        })

        expect(result).toEqual(mockVenue)
    })

    it('does not fall back to mock venue details in ticketmaster mode', async () => {
        await expect(
            resolveVenueWithDeps('venue-1', {
                mode: 'ticketmaster',
                supabaseConfigured: true,
                fetchFromDatabase: vi.fn().mockResolvedValue(null),
                fetchFromMock: vi.fn().mockResolvedValue({
                    id: 'venue-1',
                    name: 'Madison Square Garden',
                    city: 'New York',
                    country: 'USA',
                    lat: null,
                    lng: null,
                    provider_venue_id: null,
                    created_at: 'now',
                }),
            })
        ).rejects.toThrow('Venue not found')
    })

    it('returns empty venue events in ticketmaster mode when DB has no rows', async () => {
        const fetchFromMock = vi.fn().mockResolvedValue([{ id: 'mock-event' }])

        const result = await resolveVenueEventsWithDeps('venue-1', {
            mode: 'ticketmaster',
            supabaseConfigured: true,
            fetchFromDatabase: vi.fn().mockResolvedValue([]),
            fetchFromMock,
        })

        expect(result).toEqual([])
        expect(fetchFromMock).not.toHaveBeenCalled()
    })
})
