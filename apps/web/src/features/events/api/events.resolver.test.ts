import { describe, expect, it, vi } from 'vitest'
import { resolveCitiesWithDeps, resolveEventWithDeps, resolveEventsWithDeps } from './events'

describe('event resolver policy', () => {
    it('does not fall back to mock in ticketmaster mode when DB is empty', async () => {
        const fetchFromMock = vi.fn().mockResolvedValue({
            data: [{ id: 'mock-event' }],
            count: 1,
            page: 1,
            pageSize: 12,
            hasMore: false,
        })

        const result = await resolveEventsWithDeps(
            { page: 1, pageSize: 12 },
            {
                mode: 'ticketmaster',
                supabaseConfigured: true,
                fetchFromDatabase: vi.fn().mockResolvedValue({
                    data: [],
                    count: 0,
                    page: 1,
                    pageSize: 12,
                    hasMore: false,
                }),
                fetchFromTicketmasterLive: vi.fn().mockResolvedValue(null),
                fetchFromMock,
            }
        )

        expect(result.data).toEqual([])
        expect(fetchFromMock).not.toHaveBeenCalled()
    })

    it('falls back to mock in mock mode after an empty DB result', async () => {
        const mockResponse = {
            data: [{ id: 'mock-event' }],
            count: 1,
            page: 1,
            pageSize: 12,
            hasMore: false,
        }

        const result = await resolveEventsWithDeps(
            { page: 1, pageSize: 12 },
            {
                mode: 'mock',
                supabaseConfigured: true,
                fetchFromDatabase: vi.fn().mockResolvedValue({
                    data: [],
                    count: 0,
                    page: 1,
                    pageSize: 12,
                    hasMore: false,
                }),
                fetchFromTicketmasterLive: vi.fn().mockResolvedValue(null),
                fetchFromMock: vi.fn().mockResolvedValue(mockResponse),
            }
        )

        expect(result).toEqual(mockResponse)
    })

    it('uses live Ticketmaster before mock in all mode', async () => {
        const fetchFromMock = vi.fn().mockResolvedValue({
            data: [{ id: 'mock-event' }],
            count: 1,
            page: 1,
            pageSize: 12,
            hasMore: false,
        })
        const liveResponse = {
            data: [{ id: 'tm-live-event' }],
            count: 1,
            page: 1,
            pageSize: 12,
            hasMore: false,
        }

        const result = await resolveEventsWithDeps(
            { page: 1, pageSize: 12 },
            {
                mode: 'all',
                supabaseConfigured: false,
                fetchFromDatabase: vi.fn().mockResolvedValue(null),
                fetchFromTicketmasterLive: vi.fn().mockResolvedValue(liveResponse),
                fetchFromMock,
            }
        )

        expect(result).toEqual(liveResponse)
        expect(fetchFromMock).not.toHaveBeenCalled()
    })

    it('throws for missing event in ticketmaster mode without mock fallback', async () => {
        await expect(
            resolveEventWithDeps('missing-event', {
                mode: 'ticketmaster',
                supabaseConfigured: true,
                fetchFromDatabase: vi.fn().mockResolvedValue(null),
                fetchFromTicketmasterLive: vi.fn().mockResolvedValue(null),
                fetchFromMock: vi.fn().mockResolvedValue({ id: 'mock-event' }),
            })
        ).rejects.toThrow('Event not found')
    })

    it('does not fall back to mock cities in ticketmaster mode', async () => {
        const fetchFromMock = vi.fn().mockResolvedValue(['London'])

        const result = await resolveCitiesWithDeps({
            mode: 'ticketmaster',
            supabaseConfigured: true,
            fetchFromDatabase: vi.fn().mockResolvedValue([]),
            fetchFromMock,
        })

        expect(result).toEqual([])
        expect(fetchFromMock).not.toHaveBeenCalled()
    })
})
