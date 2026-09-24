import { describe, expect, it } from 'vitest'
import {
    diffSetlistSongs,
    setlistKeys,
    setlistSaveErrorMessage,
    type EditedSetlistSong,
    type SavedSetlistSong,
    type SetlistSongsDiff,
} from './setlists'

function row(
    id: string,
    songId: string,
    position: number,
    flags: Partial<Pick<SavedSetlistSong, 'is_encore' | 'is_debut'>> = {}
): SavedSetlistSong {
    return { id, song_id: songId, position, is_encore: false, is_debut: false, ...flags }
}

/** The list as the editor leaves it: positions follow the order shown. */
function listed(rows: SavedSetlistSong[]): EditedSetlistSong[] {
    return rows.map((r, position) => ({ setlistSongId: r.id, position, isEncore: r.is_encore, isDebut: r.is_debut }))
}

/** Runs the writes the way useUpdateSetlist does, checking UNIQUE(setlist_id, song_id, position) after each one. */
function applyInOrder(saved: SavedSetlistSong[], { remove, updates }: SetlistSongsDiff): SavedSetlistSong[] {
    let rows = saved.filter(r => !remove.includes(r.id))
    for (const { id, ...values } of updates) {
        rows = rows.map(r => (r.id === id ? { ...r, ...values } : r))
        const keys = rows.map(r => `${r.song_id}@${r.position}`)
        if (new Set(keys).size !== keys.length) {
            throw new Error(`updating ${id} breaks UNIQUE(setlist_id, song_id, position)`)
        }
    }
    return rows.sort((x, y) => x.position - y.position)
}

function permutations<T>(items: T[]): T[][] {
    if (items.length <= 1) return [items]
    return items.flatMap((item, i) =>
        permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(rest => [item, ...rest])
    )
}

describe('setlistKeys', () => {
    it('generates all key', () => {
        expect(setlistKeys.all).toEqual(['setlists'])
    })

    it('generates byEvent key', () => {
        expect(setlistKeys.byEvent('event-1')).toEqual(['setlists', 'event', 'event-1'])
    })

    it('generates detail key', () => {
        expect(setlistKeys.detail('setlist-1')).toEqual(['setlists', 'detail', 'setlist-1'])
    })
})

describe('setlistSaveErrorMessage', () => {
    it('turns the rate limiter into a wait message', () => {
        expect(setlistSaveErrorMessage(new Error('Please wait before creating another setlist'))).toBe(
            'Give it a few seconds before saving again.'
        )
    })

    it('asks a signed-out user to sign in again', () => {
        expect(setlistSaveErrorMessage(new Error('Not authenticated'))).toBe('Sign in again to save the setlist.')
    })

    it('explains UNIQUE(event_id, user_id) as an existing setlist', () => {
        expect(setlistSaveErrorMessage({ code: '23505', message: 'duplicate key value' })).toBe(
            'You already have a setlist for this gig. Edit that one instead.'
        )
    })

    it('never shows the raw database message', () => {
        const rls = { code: '42501', message: 'new row violates row-level security policy for table "setlists"' }
        expect(setlistSaveErrorMessage(rls)).toBe("Couldn't save the setlist. Try again.")
    })
})

describe('diffSetlistSongs', () => {
    const saved = [
        row('a', 'song-1', 0),
        row('b', 'song-2', 1),
        row('c', 'song-3', 2),
        row('d', 'song-4', 3, { is_encore: true }),
    ]
    const [a, b, c, d] = saved

    it('writes nothing when the list is unchanged', () => {
        expect(diffSetlistSongs(saved, listed(saved))).toEqual({ remove: [], updates: [] })
    })

    it('removes dropped rows and closes the gap behind them', () => {
        expect(diffSetlistSongs(saved, listed([a, c, d]))).toEqual({
            remove: ['b'],
            updates: [
                { id: 'c', position: 1, is_encore: false, is_debut: false },
                { id: 'd', position: 2, is_encore: true, is_debut: false },
            ],
        })
    })

    it('updates encore and debut flags in place', () => {
        expect(diffSetlistSongs(saved, listed([a, { ...b, is_debut: true }, { ...c, is_encore: true }, d]))).toEqual({
            remove: [],
            updates: [
                { id: 'b', position: 1, is_encore: false, is_debut: true },
                { id: 'c', position: 2, is_encore: true, is_debut: false },
            ],
        })
    })

    it('moves rows of different songs straight to their new positions', () => {
        expect(diffSetlistSongs(saved, listed([d, a, b, c])).updates).toEqual([
            { id: 'a', position: 1, is_encore: false, is_debut: false },
            { id: 'b', position: 2, is_encore: false, is_debut: false },
            { id: 'c', position: 3, is_encore: false, is_debut: false },
            { id: 'd', position: 0, is_encore: true, is_debut: false },
        ])
    })

    it('parks two plays of the same song before swapping them', () => {
        const plays = [row('intro', 'song-1', 0), row('reprise', 'song-1', 1)]
        const [intro, reprise] = plays
        const diff = diffSetlistSongs(plays, listed([reprise, intro]))

        expect(diff.updates).toEqual([
            { id: 'intro', position: 2 },
            { id: 'reprise', position: 3 },
            { id: 'intro', position: 1, is_encore: false, is_debut: false },
            { id: 'reprise', position: 0, is_encore: false, is_debut: false },
        ])
        expect(applyInOrder(plays, diff).map(r => r.id)).toEqual(['reprise', 'intro'])

        const direct = [
            { id: 'intro', position: 1 },
            { id: 'reprise', position: 0 },
        ]
        expect(() => applyInOrder(plays, { remove: [], updates: direct })).toThrow()
        expect(() => applyInOrder(plays, { remove: [], updates: [...direct].reverse() })).toThrow()
    })

    it('keeps UNIQUE(setlist_id, song_id, position) through every reorder and removal of a set with repeats', () => {
        const repeats = [
            row('r0', 'song-1', 0),
            row('r1', 'song-2', 1),
            row('r2', 'song-1', 2),
            row('r3', 'song-2', 3),
            row('r4', 'song-1', 4, { is_encore: true }),
        ]

        for (const order of permutations(repeats)) {
            for (const dropped of [undefined, ...repeats]) {
                const kept = order
                    .filter(r => r !== dropped)
                    .map((r, i) => (i === 0 ? { ...r, is_debut: !r.is_debut } : r))
                const edited = listed(kept)
                const result = applyInOrder(repeats, diffSetlistSongs(repeats, edited))

                expect(
                    result.map(r => [r.id, r.position, r.is_encore, r.is_debut]),
                    `order ${order.map(r => r.id).join(',')}, dropped ${dropped?.id ?? 'none'}`
                ).toEqual(edited.map(s => [s.setlistSongId, s.position, s.isEncore, s.isDebut]))
            }
        }
    })

    it('finishes a save that stopped halfway from the rows as they were left', () => {
        // The swap above after its first write: the intro parked, the reprise not yet.
        const leftOver = [row('intro', 'song-1', 2), row('reprise', 'song-1', 1)]
        const edited = [
            { setlistSongId: 'reprise', position: 0, isEncore: false, isDebut: false },
            { setlistSongId: 'intro', position: 1, isEncore: false, isDebut: false },
        ]

        const result = applyInOrder(leftOver, diffSetlistSongs(leftOver, edited))

        expect(result.map(r => [r.id, r.position])).toEqual([
            ['reprise', 0],
            ['intro', 1],
        ])
    })

    it('skips rows deleted elsewhere since the editor opened', () => {
        expect(diffSetlistSongs([a], listed([a, b]))).toEqual({ remove: [], updates: [] })
    })

    it('throws on a song with no saved row instead of dropping it', () => {
        const added = { position: 4, isEncore: false, isDebut: false }
        expect(() => diffSetlistSongs(saved, [...listed(saved), added])).toThrow(
            'Songs can only be added before a setlist is saved'
        )
    })
})
