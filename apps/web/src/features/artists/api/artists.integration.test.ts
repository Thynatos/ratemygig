import { describe, it, expect } from 'vitest'
import { resolveArtists, resolveArtist, resolveArtistEvents } from './resolver'

describe('artists integration (mock-only flow)', () => {
    it('resolveArtists returns mock artists when Supabase is not configured', async () => {
        const result = await resolveArtists(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(result.data.length).toBeGreaterThan(0)
        expect(result.hasMore).toBe(false)

        const artist = result.data[0]
        expect(artist.id).toBeDefined()
        expect(artist.name).toBeDefined()
        expect(artist.provider_artist_id).toBeDefined()
    })

    it('resolveArtists filters mock artists by search', async () => {
        const all = await resolveArtists(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const searchTerm = all.data[0].name.slice(0, 3)

        const filtered = await resolveArtists(searchTerm, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(filtered.data.length).toBeGreaterThan(0)
        expect(filtered.data.every(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))).toBe(true)
    })

    it('resolveArtist returns a mock artist by ID', async () => {
        const all = await resolveArtists(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const targetId = all.data[0].id

        const artist = await resolveArtist(targetId, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(artist.id).toBe(targetId)
        expect(artist.name).toBe(all.data[0].name)
    })

    it('resolveArtist throws for unknown artist ID', async () => {
        await expect(
            resolveArtist('nonexistent-artist-id', {
                mode: 'mock',
                supabaseConfigured: false,
            })
        ).rejects.toThrow('Artist not found')
    })

    it('resolveArtistEvents returns mock events for an artist', async () => {
        const all = await resolveArtists(undefined, {
            mode: 'mock',
            supabaseConfigured: false,
        })
        const targetId = all.data[0].id

        const events = await resolveArtistEvents(targetId, {
            mode: 'mock',
            supabaseConfigured: false,
        })

        expect(events).toBeInstanceOf(Array)
    })
})
