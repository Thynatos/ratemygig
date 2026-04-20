import { describe, expect, it, vi } from 'vitest'
import { resolveArtistEventsWithDeps, resolveArtistWithDeps, resolveArtistsWithDeps } from './artists'

describe('artist resolver policy', () => {
    it('does not fall back to mock artists in ticketmaster mode', async () => {
        const fetchFromMock = vi.fn().mockResolvedValue([{ id: 'mock-artist' }])

        const result = await resolveArtistsWithDeps('tay', {
            mode: 'ticketmaster',
            supabaseConfigured: true,
            fetchFromDatabase: vi.fn().mockResolvedValue({ data: [], hasMore: false }),
            fetchFromMock,
        })

        expect(result).toEqual({ data: [], hasMore: false })
        expect(fetchFromMock).not.toHaveBeenCalled()
    })

    it('falls back to mock artist details in mock mode', async () => {
        const mockArtist = { id: 'artist-1', name: 'Taylor Swift', provider_artist_id: 'artist-1', created_at: 'now' }

        const result = await resolveArtistWithDeps('artist-1', {
            mode: 'mock',
            supabaseConfigured: true,
            fetchFromDatabase: vi.fn().mockResolvedValue(null),
            fetchFromMock: vi.fn().mockResolvedValue(mockArtist),
        })

        expect(result).toEqual(mockArtist)
    })

    it('does not fall back to mock artist details in ticketmaster mode', async () => {
        await expect(
            resolveArtistWithDeps('artist-1', {
                mode: 'ticketmaster',
                supabaseConfigured: true,
                fetchFromDatabase: vi.fn().mockResolvedValue(null),
                fetchFromMock: vi.fn().mockResolvedValue({
                    id: 'artist-1',
                    name: 'Taylor Swift',
                    provider_artist_id: 'artist-1',
                    created_at: 'now',
                }),
            })
        ).rejects.toThrow('Artist not found')
    })

    it('returns empty artist events in ticketmaster mode when DB has no links', async () => {
        const fetchFromMock = vi.fn().mockResolvedValue([{ id: 'mock-event' }])

        const result = await resolveArtistEventsWithDeps('artist-1', {
            mode: 'ticketmaster',
            supabaseConfigured: true,
            fetchFromDatabase: vi.fn().mockResolvedValue([]),
            fetchFromMock,
        })

        expect(result).toEqual([])
        expect(fetchFromMock).not.toHaveBeenCalled()
    })
})
