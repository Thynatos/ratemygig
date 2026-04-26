import { describe, it, expect } from 'vitest'
import { resolveVenues, resolveVenue, resolveVenueEvents } from './resolver'

describe('venues integration (mock-only flow)', () => {
    it('resolveVenues returns mock venues when Supabase is not configured', async () => {
        const result = await resolveVenues(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(result.data.length).toBeGreaterThan(0)
        expect(result.hasMore).toBe(false)

        const venue = result.data[0]
        expect(venue.id).toBeDefined()
        expect(venue.name).toBeDefined()
        expect(venue.city).toBeDefined()
        expect(venue.country).toBeDefined()
    })

    it('resolveVenues filters mock venues by city', async () => {
        const all = await resolveVenues(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const targetCity = all.data[0].city

        const filtered = await resolveVenues(targetCity, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(filtered.data.length).toBeGreaterThan(0)
        expect(filtered.data.every(v => v.city === targetCity)).toBe(true)
    })

    it('resolveVenue returns a mock venue by ID', async () => {
        const all = await resolveVenues(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const targetId = all.data[0].id

        const venue = await resolveVenue(targetId, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(venue.id).toBe(targetId)
        expect(venue.name).toBe(all.data[0].name)
    })

    it('resolveVenue throws for unknown venue ID', async () => {
        await expect(
            resolveVenue('nonexistent-venue-id', {
                mode: 'mock',
                supabaseConfigured: false,
            })
        ).rejects.toThrow('Venue not found')
    })

    it('resolveVenueEvents returns mock events for a venue', async () => {
        const all = await resolveVenues(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const targetId = all.data[0].id

        const events = await resolveVenueEvents(targetId, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(events).toBeInstanceOf(Array)
    })
})
