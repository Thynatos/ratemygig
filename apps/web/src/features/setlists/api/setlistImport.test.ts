import { describe, expect, it, vi } from 'vitest'
import {
    artistNamesMatch,
    artistNameTokens,
    buildImportCandidates,
    importErrorCodeFromBody,
    importErrorMessage,
    isSameNight,
    mapSetlistImport,
    runSetlistImportWithDeps,
    SetlistImportError,
    type ImportSetlistDeps,
} from './setlistImport'
import type { SetlistImport } from '@/shared/validation/schemas'

const IMPORTED: SetlistImport = {
    artistName: 'Arctic Monkeys',
    eventDate: '2023-03-14',
    venueName: 'Madison Square Garden',
    url: 'https://www.setlist.fm/setlist/arctic-monkeys/2023/madison-square-garden-new-york-ny-5bab0b4c.html',
    songs: [
        { name: 'Sculptures of Anything Goes', encore: false },
        { name: 'Brianstorm', encore: false },
        { name: 'I Wanna Be Yours', encore: true },
        { name: 'R U Mine?', encore: true },
    ],
}

const HEADLINER = { id: 'artist-1', name: 'Arctic Monkeys' }
const SUPPORT = { id: 'artist-2', name: 'Fontaines D.C.' }

describe('artistNameTokens', () => {
    it('ignores case, accents, punctuation and a leading "the"', () => {
        expect(artistNameTokens('The Beatles')).toEqual(['beatles'])
        expect(artistNameTokens('Beyoncé')).toEqual(['beyonce'])
        expect(artistNameTokens('Guns N’ Roses')).toEqual(['guns', 'n', 'roses'])
    })

    it('reads & and + as "and"', () => {
        expect(artistNameTokens('Florence + the Machine')).toEqual(['florence', 'and', 'the', 'machine'])
        expect(artistNameTokens('Simon & Garfunkel')).toEqual(['simon', 'and', 'garfunkel'])
    })

    it('keeps a band called "The The" and non-Latin names', () => {
        expect(artistNameTokens('The The')).toEqual(['the'])
        expect(artistNameTokens('坂本龍一')).toEqual(['坂本龍一'])
    })
})

describe('artistNamesMatch', () => {
    it('matches different spellings of the same act', () => {
        expect(artistNamesMatch('The Beatles', 'Beatles')).toBe(true)
        expect(artistNamesMatch('AC/DC', 'ACDC')).toBe(true)
        expect(artistNamesMatch('Florence + The Machine', 'Florence and the Machine')).toBe(true)
        expect(artistNamesMatch('Sigur Rós', 'SIGUR ROS')).toBe(true)
    })

    it('matches a billing that extends the name with a joiner', () => {
        expect(artistNamesMatch('Bruce Springsteen', 'Bruce Springsteen & The E Street Band')).toBe(true)
        expect(artistNamesMatch('Bonobo feat. Jordan Rakei', 'Bonobo')).toBe(true)
    })

    it('rejects different acts, including bare prefixes', () => {
        expect(artistNamesMatch('Muse', 'Museum')).toBe(false)
        expect(artistNamesMatch('Arctic Monkeys', 'The Last Shadow Puppets')).toBe(false)
        expect(artistNamesMatch('Bruce Springsteen', 'Bruce Hornsby')).toBe(false)
    })

    it('compares symbol-only names literally', () => {
        expect(artistNamesMatch('!!!', '!!!')).toBe(true)
        expect(artistNamesMatch('!!!', '???')).toBe(false)
    })
})

describe('buildImportCandidates', () => {
    it('prefers the linked artists, which carry ids', () => {
        expect(buildImportCandidates([HEADLINER], ['Someone Else'])).toEqual([HEADLINER])
    })

    it('falls back to line-up names when the event has no linked artists', () => {
        expect(buildImportCandidates([], ['Arctic Monkeys', ' '])).toEqual([{ name: 'Arctic Monkeys' }])
    })
})

describe('isSameNight', () => {
    it('accepts the same day and a day either way (venue time zones are unknown)', () => {
        expect(isSameNight('2023-03-14', '2023-03-14T19:30:00+00:00')).toBe(true)
        expect(isSameNight('2023-03-14', '2023-03-15T04:00:00+00:00')).toBe(true)
        expect(isSameNight('2023-03-14', '2023-03-13T23:00:00+00:00')).toBe(true)
    })

    it('flags a different night of the tour', () => {
        expect(isSameNight('2023-03-12', '2023-03-14T19:30:00+00:00')).toBe(false)
    })

    it('does not flag what it cannot check', () => {
        expect(isSameNight('2023-03-14', undefined)).toBe(true)
        expect(isSameNight('2023-03-14', 'not a date')).toBe(true)
    })
})

describe('mapSetlistImport', () => {
    it('prefills positions in play order with encore flags', () => {
        const result = mapSetlistImport(IMPORTED, [HEADLINER])
        expect(result.ok).toBe(true)
        if (!result.ok) return

        expect(result.songs.map(s => [s.position, s.name, s.isEncore])).toEqual([
            [0, 'Sculptures of Anything Goes', false],
            [1, 'Brianstorm', false],
            [2, 'I Wanna Be Yours', true],
            [3, 'R U Mine?', true],
        ])
        expect(result.songs.every(s => s.isDebut === false && s.notes === '' && s.id === undefined)).toBe(true)
    })

    it('files every song under the matched artist for UNIQUE(name, artist_id)', () => {
        const result = mapSetlistImport({ ...IMPORTED, artistName: 'Fontaines DC' }, [HEADLINER, SUPPORT])
        expect(result.ok && result.songs.every(s => s.artistId === 'artist-2')).toBe(true)
        expect(result.ok && result.source.artistId).toBe('artist-2')
    })

    it('carries the source and attribution link for review', () => {
        const result = mapSetlistImport(IMPORTED, [HEADLINER], '2023-03-15T00:30:00+00:00')
        expect(result.ok && result.source).toEqual({
            artistName: 'Arctic Monkeys',
            venueName: 'Madison Square Garden',
            eventDate: '2023-03-14',
            url: IMPORTED.url,
            artistId: 'artist-1',
            sameNight: true,
        })
    })

    it('marks a different night so the editor can warn', () => {
        const result = mapSetlistImport(IMPORTED, [HEADLINER], '2023-03-20T19:00:00+00:00')
        expect(result.ok && result.source.sameNight).toBe(false)
    })

    it('leaves artistId unset when only line-up names are known', () => {
        const result = mapSetlistImport(IMPORTED, [{ name: 'Arctic Monkeys' }])
        expect(result.ok && result.songs[0].artistId).toBeUndefined()
    })

    it('rejects a setlist by an artist who is not on the event', () => {
        expect(mapSetlistImport(IMPORTED, [SUPPORT])).toEqual({ ok: false, code: 'artist_mismatch' })
        expect(mapSetlistImport(IMPORTED, [])).toEqual({ ok: false, code: 'artist_mismatch' })
    })

    it('reports a setlist with no songs yet', () => {
        expect(mapSetlistImport({ ...IMPORTED, songs: [] }, [HEADLINER])).toEqual({ ok: false, code: 'empty' })
    })
})

describe('importErrorCodeFromBody', () => {
    it('reads the Edge Function error code', () => {
        expect(importErrorCodeFromBody({ error: { code: 'not_found' } })).toBe('not_found')
        expect(importErrorCodeFromBody({ error: { code: 'quota_exceeded' } })).toBe('quota_exceeded')
        expect(importErrorCodeFromBody({ error: { code: 'invalid_input' } })).toBe('invalid_input')
        expect(importErrorCodeFromBody({ error: { code: 'not_configured' } })).toBe('not_configured')
    })

    it("treats the gateway's own 404 as a function that isn't deployed", () => {
        expect(importErrorCodeFromBody({ code: 'NOT_FOUND', message: 'Requested function was not found' })).toBe(
            'not_configured'
        )
    })

    it('falls back to upstream for anything else', () => {
        expect(importErrorCodeFromBody({ error: { code: 'upstream_error' } })).toBe('upstream')
        expect(importErrorCodeFromBody({ error: { code: 'something_new' } })).toBe('upstream')
        expect(importErrorCodeFromBody(null)).toBe('upstream')
        expect(importErrorCodeFromBody('oops')).toBe('upstream')
    })
})

describe('importErrorMessage', () => {
    it('names the three failure modes plainly', () => {
        expect(importErrorMessage(new SetlistImportError('not_found'))).toMatch(/no setlist at that link/)
        expect(importErrorMessage(new SetlistImportError('artist_mismatch', 'Oasis'))).toBe(
            "That setlist is for Oasis, who isn't on this gig's line-up."
        )
        expect(importErrorMessage(new SetlistImportError('quota_exceeded'))).toMatch(/too many requests/)
    })

    it('strips markup from the setlist.fm artist name', () => {
        expect(importErrorMessage(new SetlistImportError('artist_mismatch', '<b>Oasis</b>'))).not.toContain('<b>')
    })

    it('has a generic message for errors that are not import errors', () => {
        expect(importErrorMessage(new Error('boom'))).toBe('Something went wrong while importing. Try again.')
    })
})

describe('runSetlistImportWithDeps', () => {
    const VARIABLES = {
        input: IMPORTED.url,
        eventId: 'event-1',
        lineup: ['Arctic Monkeys'],
        eventStartAt: '2023-03-14T23:30:00+00:00',
    }

    function deps(overrides: Partial<ImportSetlistDeps> = {}): ImportSetlistDeps {
        return {
            allow: () => true,
            invoke: vi.fn(async () => IMPORTED),
            fetchArtists: vi.fn(async () => [HEADLINER]),
            ...overrides,
        }
    }

    it('returns the prefilled songs and their source', async () => {
        const d = deps()
        const result = await runSetlistImportWithDeps(VARIABLES, d)
        expect(result.songs).toHaveLength(4)
        expect(result.source.artistId).toBe('artist-1')
        expect(d.invoke).toHaveBeenCalledWith(IMPORTED.url)
        expect(d.fetchArtists).toHaveBeenCalledWith('event-1')
    })

    it('refuses to call setlist.fm while rate limited', async () => {
        const d = deps({ allow: () => false })
        await expect(runSetlistImportWithDeps(VARIABLES, d)).rejects.toMatchObject({ code: 'rate_limited' })
        expect(d.invoke).not.toHaveBeenCalled()
    })

    it("raises artist_mismatch with setlist.fm's artist name", async () => {
        const d = deps({ fetchArtists: vi.fn(async () => [SUPPORT]) })
        await expect(runSetlistImportWithDeps(VARIABLES, d)).rejects.toMatchObject({
            code: 'artist_mismatch',
            artistName: 'Arctic Monkeys',
        })
    })

    it('passes Edge Function errors through unchanged', async () => {
        const d = deps({ invoke: vi.fn(async () => Promise.reject(new SetlistImportError('not_found'))) })
        await expect(runSetlistImportWithDeps(VARIABLES, d)).rejects.toMatchObject({ code: 'not_found' })
    })
})
