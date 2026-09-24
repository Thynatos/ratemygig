import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { checkA11y } from '@/test/axe'
import { SetlistEditor } from './SetlistEditor'
import { ToastProvider } from '@/shared/components/ui/Toast'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
    useCreateSetlist,
    useUpdateSetlist,
    diffSetlistSongs,
    type EditedSetlistSong,
} from '../api/setlists'
import { useSongSearch } from '../api/songs'
import {
    useImportSetlist,
    mapSetlistImport,
    SetlistImportError,
    type SetlistImportResult,
} from '../api/setlistImport'
import type { SetlistImport } from '@/shared/validation/schemas'
import type { SetlistWithSongs } from '@core/index'

vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('../api/setlists', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/setlists')>()),
    useCreateSetlist: vi.fn(),
    useUpdateSetlist: vi.fn(),
}))
vi.mock('../api/songs', () => ({ useSongSearch: vi.fn() }))
vi.mock('../api/setlistImport', async importOriginal => ({
    ...(await importOriginal<typeof import('../api/setlistImport')>()),
    useImportSetlist: vi.fn(),
}))

const SETLIST_URL =
    'https://www.setlist.fm/setlist/arctic-monkeys/2023/madison-square-garden-new-york-ny-5bab0b4c.html'

const EVENT = { start_at: '2023-03-14T23:30:00+00:00', lineup: ['Arctic Monkeys'] }

const IMPORTED: SetlistImport = {
    artistName: 'Arctic Monkeys',
    eventDate: '2023-03-14',
    venueName: 'Madison Square Garden',
    url: SETLIST_URL,
    songs: [
        { name: 'Sculptures of Anything Goes', encore: false },
        { name: 'Brianstorm', encore: false },
        { name: 'I Wanna Be Yours', encore: true },
        { name: 'R U Mine?', encore: true },
    ],
}

function importResult(eventStartAt = EVENT.start_at): SetlistImportResult {
    const mapping = mapSetlistImport(IMPORTED, [{ id: 'artist-1', name: 'Arctic Monkeys' }], eventStartAt)
    if (!mapping.ok) throw new Error('fixture should map')
    return { songs: mapping.songs, source: mapping.source }
}

type MutateCallbacks<T> = { onSuccess?: (data: T) => void; onError?: (error: unknown) => void }

const importMutate = vi.fn()
const createMutate = vi.fn()
const updateMutate = vi.fn()

function importSucceeds(result: SetlistImportResult) {
    importMutate.mockImplementation((_vars: unknown, callbacks: MutateCallbacks<SetlistImportResult>) =>
        callbacks.onSuccess?.(result)
    )
}

function importFails(error: unknown) {
    importMutate.mockImplementation((_vars: unknown, callbacks: MutateCallbacks<SetlistImportResult>) =>
        callbacks.onError?.(error)
    )
}

function renderEditor(props: Partial<Parameters<typeof SetlistEditor>[0]> = {}) {
    return render(
        <ToastProvider>
            <SetlistEditor eventId="event-1" event={EVENT} onClose={vi.fn()} {...props} />
        </ToastProvider>
    )
}

function importFrom(url: string) {
    fireEvent.change(screen.getByLabelText('Import from setlist.fm'), { target: { value: url } })
    fireEvent.click(screen.getByRole('button', { name: 'Import' }))
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as unknown as ReturnType<typeof useAuth>)
    vi.mocked(useSongSearch).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useSongSearch>)
    vi.mocked(useCreateSetlist).mockReturnValue({
        mutate: createMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useCreateSetlist>)
    vi.mocked(useUpdateSetlist).mockReturnValue({
        mutate: updateMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useUpdateSetlist>)
    vi.mocked(useImportSetlist).mockReturnValue({
        mutate: importMutate,
        isPending: false,
    } as unknown as ReturnType<typeof useImportSetlist>)
})

function savedSong(
    id: string,
    name: string,
    position: number,
    flags: { is_encore?: boolean; is_debut?: boolean } = {}
): SetlistWithSongs['songs'][number] {
    return {
        id,
        setlist_id: 'setlist-1',
        song_id: `song-${id}`,
        position,
        is_encore: false,
        is_debut: false,
        notes: null,
        created_at: '2023-03-15T00:00:00Z',
        ...flags,
        song: { id: `song-${id}`, name, artist_id: 'artist-1', created_at: '2023-03-15T00:00:00Z' },
    }
}

const SAVED: SetlistWithSongs = {
    id: 'setlist-1',
    event_id: 'event-1',
    user_id: 'user-1',
    source: 'manual',
    notes: 'Great night',
    created_at: '2023-03-15T00:00:00Z',
    updated_at: '2023-03-15T00:00:00Z',
    songs: [
        savedSong('row-1', 'Sculptures of Anything Goes', 0),
        savedSong('row-2', 'Brianstorm', 1),
        savedSong('row-3', 'I Wanna Be Yours', 2, { is_encore: true }),
        savedSong('row-4', 'R U Mine?', 3, { is_encore: true }),
    ],
    profile: null,
    event: null,
}

describe('SetlistEditor — editing a saved setlist', () => {
    it('saves removals, reorders and encore/debut changes along with the notes', () => {
        renderEditor({ existingSetlist: SAVED })

        fireEvent.click(screen.getByRole('button', { name: 'Remove Brianstorm' }))
        fireEvent.click(screen.getByRole('button', { name: 'Move R U Mine? earlier' }))
        const rows = screen.getAllByRole('listitem')
        fireEvent.click(within(rows[0]).getByRole('button', { name: 'Debut' }))
        fireEvent.click(within(rows[1]).getByRole('button', { name: 'Encore' }))
        fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'No Brianstorm tonight' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

        expect(createMutate).not.toHaveBeenCalled()
        expect(updateMutate).toHaveBeenCalledTimes(1)
        const [input] = updateMutate.mock.calls[0]
        expect(input).toMatchObject({ setlistId: 'setlist-1', notes: 'No Brianstorm tonight' })
        expect(
            input.songs.map((s: EditedSetlistSong) => [s.setlistSongId, s.position, s.isEncore, s.isDebut])
        ).toEqual([
            ['row-1', 0, false, true],
            ['row-4', 1, false, false],
            ['row-3', 2, true, false],
        ])
        expect(diffSetlistSongs(SAVED.songs, input.songs)).toEqual({
            remove: ['row-2'],
            updates: [
                { id: 'row-1', position: 0, is_encore: false, is_debut: true },
                { id: 'row-4', position: 1, is_encore: false, is_debut: false },
            ],
        })
    })

    it('leaves the songs alone when only the notes change', () => {
        renderEditor({ existingSetlist: SAVED })

        fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Great night, loud crowd' } })
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

        const [input] = updateMutate.mock.calls[0]
        expect(input.notes).toBe('Great night, loud crowd')
        expect(diffSetlistSongs(SAVED.songs, input.songs)).toEqual({ remove: [], updates: [] })
    })

    it('keeps the edits on screen and says so when the save fails', () => {
        updateMutate.mockImplementation((_input: unknown, callbacks: MutateCallbacks<unknown>) =>
            callbacks.onError?.(new Error('Please wait before updating setlists again'))
        )
        const onClose = vi.fn()
        renderEditor({ existingSetlist: SAVED, onClose })

        fireEvent.click(screen.getByRole('button', { name: 'Remove Brianstorm' }))
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent("Couldn't save")
        expect(alert).toHaveTextContent('Give it a few seconds before saving again.')
        expect(onClose).not.toHaveBeenCalled()
        const rows = screen.getAllByRole('listitem')
        expect(rows).toHaveLength(3)
        expect(rows[1]).toHaveTextContent('02I Wanna Be Yours')
    })
})

describe('SetlistEditor — import from setlist.fm', () => {
    it('sends the pasted link with the gig’s line-up and date', () => {
        importSucceeds(importResult())
        renderEditor()

        importFrom(SETLIST_URL)

        expect(importMutate).toHaveBeenCalledWith(
            { input: SETLIST_URL, eventId: 'event-1', lineup: ['Arctic Monkeys'], eventStartAt: EVENT.start_at },
            expect.any(Object)
        )
    })

    it('prefills the list in play order with the encore marked', () => {
        importSucceeds(importResult())
        renderEditor()

        importFrom(SETLIST_URL)

        const rows = screen.getAllByRole('listitem')
        expect(rows).toHaveLength(4)
        expect(rows[0]).toHaveTextContent('01Sculptures of Anything Goes')
        expect(rows[1]).toHaveTextContent('02Brianstorm')
        expect(rows[2]).toHaveTextContent('03I Wanna Be Yours')
        expect(rows[3]).toHaveTextContent('04R U Mine?')

        expect(within(rows[2]).getByText('Encore', { selector: 'p' })).toBeInTheDocument()
        expect(within(rows[1]).queryByText('Encore', { selector: 'p' })).not.toBeInTheDocument()
        expect(
            screen.getAllByRole('button', { name: 'Encore' }).map(b => b.getAttribute('aria-pressed'))
        ).toEqual(['false', 'false', 'true', 'true'])
    })

    it('attributes the list to setlist.fm with the link from the response', () => {
        importSucceeds(importResult())
        renderEditor()

        importFrom(SETLIST_URL)

        const source = screen.getByRole('link', { name: /Arctic Monkeys setlist on setlist.fm/ })
        expect(source).toHaveAttribute('href', SETLIST_URL)
        expect(source).toHaveAttribute('target', '_blank')
        expect(source).toHaveAttribute('rel', 'noopener noreferrer')
        expect(screen.getByText(/Madison Square Garden/)).toBeInTheDocument()
        expect(screen.queryByText(/same night/)).not.toBeInTheDocument()
    })

    it('warns when setlist.fm dates the show on a different night', () => {
        importSucceeds(importResult('2023-03-20T19:00:00+00:00'))
        renderEditor({ event: { ...EVENT, start_at: '2023-03-20T19:00:00+00:00' } })

        importFrom(SETLIST_URL)

        expect(screen.getByText(/Make sure it's the same night/)).toBeInTheDocument()
    })

    it('saves the reviewed list through useCreateSetlist with positions, encores and the matched artist', () => {
        importSucceeds(importResult())
        renderEditor()

        importFrom(SETLIST_URL)
        fireEvent.click(screen.getByRole('button', { name: 'Save setlist' }))

        expect(createMutate).toHaveBeenCalledTimes(1)
        const [input] = createMutate.mock.calls[0]
        expect(input.eventId).toBe('event-1')
        expect(
            input.songs.map((s: { songName: string; position: number; isEncore: boolean; artistId?: string; songId?: string }) => [
                s.position,
                s.songName,
                s.isEncore,
                s.artistId,
                s.songId,
            ])
        ).toEqual([
            [0, 'Sculptures of Anything Goes', false, 'artist-1', undefined],
            [1, 'Brianstorm', false, 'artist-1', undefined],
            [2, 'I Wanna Be Yours', true, 'artist-1', undefined],
            [3, 'R U Mine?', true, 'artist-1', undefined],
        ])
    })

    it('files songs added by hand after an import under the same artist', () => {
        importSucceeds(importResult())
        renderEditor()

        importFrom(SETLIST_URL)
        fireEvent.change(screen.getByLabelText('Add a song'), { target: { value: '505' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add' }))
        fireEvent.click(screen.getByRole('button', { name: 'Save setlist' }))

        const [input] = createMutate.mock.calls[0]
        expect(input.songs[4]).toMatchObject({ songName: '505', position: 4, artistId: 'artist-1' })
    })

    it.each([
        [new SetlistImportError('not_found'), /setlist.fm has no setlist at that link/],
        [
            new SetlistImportError('artist_mismatch', 'Oasis'),
            /That setlist is for Oasis, who isn't on this gig's line-up/,
        ],
        [new SetlistImportError('quota_exceeded'), /too many requests/],
    ])('shows a toast and keeps the list untouched when the import fails (%s)', (error, message) => {
        importFails(error)
        renderEditor()

        importFrom(SETLIST_URL)

        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent("Couldn't import")
        expect(alert).toHaveTextContent(message)
        expect(screen.queryAllByRole('listitem')).toHaveLength(0)
        expect(screen.getByLabelText('Import from setlist.fm')).toHaveValue(SETLIST_URL)
    })

    it('clears the failure toast once an import succeeds', () => {
        importFails(new SetlistImportError('not_found'))
        renderEditor()
        importFrom(SETLIST_URL)
        expect(screen.getByRole('alert')).toBeInTheDocument()

        importSucceeds(importResult())
        importFrom(SETLIST_URL)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('dismisses its toast when the editor closes', () => {
        importFails(new SetlistImportError('quota_exceeded'))
        const { rerender } = renderEditor()
        importFrom(SETLIST_URL)
        expect(screen.getByRole('alert')).toBeInTheDocument()

        rerender(<ToastProvider>{null}</ToastProvider>)
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('asks before replacing songs already listed', () => {
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
        renderEditor()

        fireEvent.change(screen.getByLabelText('Add a song'), { target: { value: 'Do I Wanna Know?' } })
        fireEvent.click(screen.getByRole('button', { name: 'Add' }))
        importFrom(SETLIST_URL)

        expect(confirm).toHaveBeenCalledWith('Importing replaces the song already listed. Carry on?')
        expect(importMutate).not.toHaveBeenCalled()
        confirm.mockRestore()
    })

    it('says so when the save fails instead of failing silently', () => {
        importSucceeds(importResult())
        createMutate.mockImplementation((_input: unknown, callbacks: MutateCallbacks<unknown>) =>
            callbacks.onError?.(new Error('Please wait before creating another setlist'))
        )
        const onClose = vi.fn()
        renderEditor({ onClose })

        importFrom(SETLIST_URL)
        fireEvent.click(screen.getByRole('button', { name: 'Save setlist' }))

        const alert = screen.getByRole('alert')
        expect(alert).toHaveTextContent("Couldn't save")
        expect(alert).toHaveTextContent('Give it a few seconds before saving again.')
        expect(onClose).not.toHaveBeenCalled()
        expect(screen.getAllByRole('listitem')).toHaveLength(4)
    })

    it('keeps the import button disabled until a link is pasted', () => {
        renderEditor()
        expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
    })

    it('offers no import when editing an existing setlist', () => {
        const existing = {
            id: 'setlist-1',
            event_id: 'event-1',
            user_id: 'user-1',
            source: 'manual',
            notes: null,
            created_at: '2023-03-15T00:00:00Z',
            updated_at: '2023-03-15T00:00:00Z',
            songs: [],
            profile: null,
            event: null,
        } satisfies SetlistWithSongs
        renderEditor({ existingSetlist: existing })

        expect(screen.queryByLabelText('Import from setlist.fm')).not.toBeInTheDocument()
    })

    it('has no axe violations with an imported list on screen', async () => {
        importSucceeds(importResult())
        const { container } = renderEditor()

        importFrom(SETLIST_URL)

        expect(await checkA11y(container)).toHaveNoViolations()
    })
})

describe('SetlistEditor — songs added by hand', () => {
    function typeSong(name: string) {
        fireEvent.change(screen.getByLabelText('Add a song'), { target: { value: name } })
    }

    function saveAndGetSongs() {
        fireEvent.click(screen.getByRole('button', { name: 'Save setlist' }))
        expect(createMutate).toHaveBeenCalledTimes(1)
        return createMutate.mock.calls[0][0].songs
    }

    it("files typed songs under the gig's artist", () => {
        renderEditor({ artistId: 'artist-1' })

        typeSong('Brianstorm')
        fireEvent.click(screen.getByRole('button', { name: 'Add' }))

        expect(saveAndGetSongs()).toEqual([
            expect.objectContaining({ songId: '', songName: 'Brianstorm', position: 0, artistId: 'artist-1' }),
        ])
    })

    it("searches only that artist's songs, so a picked song is theirs too", () => {
        vi.mocked(useSongSearch).mockReturnValue({
            data: [{ id: 'song-1', name: 'Brianstorm', artist_id: 'artist-1', created_at: '2023-01-01T00:00:00Z' }],
        } as unknown as ReturnType<typeof useSongSearch>)
        renderEditor({ artistId: 'artist-1' })

        typeSong('Brian')
        expect(useSongSearch).toHaveBeenLastCalledWith('Brian', 'artist-1')
        fireEvent.click(screen.getByRole('button', { name: 'Brianstorm' }))

        expect(saveAndGetSongs()).toEqual([
            expect.objectContaining({ songId: 'song-1', songName: 'Brianstorm', artistId: 'artist-1' }),
        ])
    })

    it('keeps search and new songs unfiled when the gig has no single act', () => {
        renderEditor()

        typeSong('Brianstorm')
        expect(useSongSearch).toHaveBeenLastCalledWith('Brianstorm', undefined)
        fireEvent.click(screen.getByRole('button', { name: 'Add' }))

        const [song] = saveAndGetSongs()
        expect(song.songName).toBe('Brianstorm')
        expect(song.artistId).toBeUndefined()
    })

    it('moves search and filing to the imported artist on a gig with no single act', () => {
        importSucceeds(importResult())
        renderEditor()

        importFrom(SETLIST_URL)
        typeSong('505')

        expect(useSongSearch).toHaveBeenLastCalledWith('505', 'artist-1')
    })
})
