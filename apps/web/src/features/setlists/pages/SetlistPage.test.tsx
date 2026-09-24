import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { SetlistPage } from './SetlistPage'
import { SetlistEditor } from '../components/SetlistEditor'
import { useEventSetlists, useDeleteSetlist } from '../api/setlists'
import { useEvent, useEventArtists } from '@/features/events/api/events'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { EventArtistRef } from '@/features/events/api/eventArtists'

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/features/events/api/events', () => ({ useEvent: vi.fn(), useEventArtists: vi.fn() }))
vi.mock('../api/setlists', () => ({ useEventSetlists: vi.fn(), useDeleteSetlist: vi.fn() }))
vi.mock('../components/SetlistEditor', () => ({ SetlistEditor: vi.fn(() => null) }))

const ARCTIC_MONKEYS = { id: 'artist-1', name: 'Arctic Monkeys' }
const FOO_FIGHTERS = { id: 'artist-2', name: 'Foo Fighters' }
const HARRY_STYLES = { id: 'artist-3', name: 'Harry Styles' }

function mockGig({
    lineup,
    artists,
    isEventLoading = false,
    isArtistsLoading = false,
}: {
    lineup: string[]
    artists: EventArtistRef[]
    isEventLoading?: boolean
    isArtistsLoading?: boolean
}) {
    vi.mocked(useEvent).mockReturnValue({
        data: isEventLoading
            ? undefined
            : { id: 'event-1', name: 'The gig', start_at: '2026-07-04T18:00:00+00:00', lineup, venue: null },
        isLoading: isEventLoading,
    } as unknown as ReturnType<typeof useEvent>)
    vi.mocked(useEventArtists).mockReturnValue({
        data: isArtistsLoading ? undefined : artists,
        isLoading: isArtistsLoading,
    } as unknown as ReturnType<typeof useEventArtists>)
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={['/events/event-1/setlist']}>
            <Routes>
                <Route path="/events/:eventId/setlist" element={<SetlistPage />} />
            </Routes>
        </MemoryRouter>
    )
}

function openEditor() {
    fireEvent.click(screen.getAllByRole('button', { name: /Add the setlist/ })[0])
    const props = vi.mocked(SetlistEditor).mock.lastCall?.[0]
    expect(props).toBeDefined()
    return props!
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as unknown as ReturnType<typeof useAuth>)
    vi.mocked(useEventSetlists).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
    } as unknown as ReturnType<typeof useEventSetlists>)
    vi.mocked(useDeleteSetlist).mockReturnValue({ mutate: vi.fn() } as unknown as ReturnType<
        typeof useDeleteSetlist
    >)
})

describe('SetlistPage — which artist a new setlist is filed under', () => {
    it("gives the editor the artist of a single-act gig, so typed songs count in that artist's stats", () => {
        mockGig({ lineup: ['Arctic Monkeys'], artists: [ARCTIC_MONKEYS] })
        renderPage()

        expect(openEditor()).toMatchObject({ eventId: 'event-1', artistId: 'artist-1' })
    })

    it('gives the editor no artist for a festival, rather than the first act billed', () => {
        mockGig({
            lineup: ['Arctic Monkeys', 'Foo Fighters', 'Harry Styles'],
            artists: [ARCTIC_MONKEYS, FOO_FIGHTERS, HARRY_STYLES],
        })
        renderPage()

        expect(openEditor().artistId).toBeUndefined()
    })

    it.each([
        ['the gig', { isEventLoading: true }],
        ['its artists', { isArtistsLoading: true }],
    ])('keeps the editor shut while loading %s', (_what, loading) => {
        mockGig({ lineup: ['Arctic Monkeys'], artists: [ARCTIC_MONKEYS], ...loading })
        renderPage()

        const buttons = screen.getAllByRole('button', { name: /Add the setlist/ })
        expect(buttons.length).toBeGreaterThan(0)
        for (const button of buttons) {
            expect(button).toBeDisabled()
            expect(button).toHaveAttribute('aria-busy', 'true')
        }
        fireEvent.click(buttons[0])
        expect(SetlistEditor).not.toHaveBeenCalled()
    })
})
