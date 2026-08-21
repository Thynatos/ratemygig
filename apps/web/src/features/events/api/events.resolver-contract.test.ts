import { describe, it, expect } from 'vitest'
import { resolveEvents, resolveEvent, resolveCities } from './resolver'

describe('events resolver contract (injected deps)', () => {
    it('resolveEvents returns mock events when Supabase is not configured', async () => {
        const result = await resolveEvents({ page: 1, pageSize: 100 }, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(result.data.length).toBeGreaterThan(0)
        expect(result.count).toBeGreaterThan(0)
        expect(result.page).toBe(1)
        expect(result.hasMore).toBe(false)

        const event = result.data[0]
        expect(event.id).toBeDefined()
        expect(event.name).toBeDefined()
        expect(event.provider).toBe('mock')
        expect(event.venue).toBeDefined()
        expect(event.lineup).toBeInstanceOf(Array)
    })

    it('resolveEvents filters mock events by city', async () => {
        const all = await resolveEvents({ page: 1, pageSize: 100 }, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const targetCity = all.data[0].city

        const filtered = await resolveEvents({ city: targetCity, page: 1, pageSize: 100 }, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(filtered.data.length).toBeGreaterThan(0)
        expect(filtered.data.every(e => e.city === targetCity)).toBe(true)
    })

    it('resolveEvent returns a mock event by ID', async () => {
        const all = await resolveEvents({ page: 1, pageSize: 12 }, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const targetId = all.data[0].id

        const event = await resolveEvent(targetId, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(event.id).toBe(targetId)
        expect(event.provider).toBe('mock')
        expect(event.venue).toBeDefined()
    })

    it('resolveEvent throws for unknown event ID', async () => {
        await expect(
            resolveEvent('nonexistent-event-id', {
                mode: 'mock',
                supabaseConfigured: false,
            })
        ).rejects.toThrow('Event not found')
    })

    it('resolveCities returns mock cities when Supabase is not configured', async () => {
        const cities = await resolveCities({
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(cities.length).toBeGreaterThan(0)
        expect(cities).toEqual([...cities].sort((a, b) => a.localeCompare(b)))
    })
})
