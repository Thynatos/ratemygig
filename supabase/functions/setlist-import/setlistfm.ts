// Pure setlist.fm helpers for the setlist-import Edge Function.
//
// No imports and no Deno globals, on purpose: the web app's vitest suite
// imports this file directly (apps/web/src/features/setlists/api/
// setlist-import-function.test.ts), so it has to run unchanged under both
// Deno and Node.

export const SETLISTFM_API_BASE = 'https://api.setlist.fm/rest/1.0'
export const SETLISTFM_SITE = 'https://www.setlist.fm/'

export interface NormalizedSong {
    name: string
    encore: boolean
}

export interface NormalizedSetlist {
    artistName: string
    /** Local calendar date of the show as ISO `yyyy-MM-dd` (setlist.fm sends `dd-MM-yyyy`). */
    eventDate: string
    venueName: string
    /**
     * setlist.fm's attribution link for this setlist. The API terms require it
     * wherever the data is shown, so it travels with the data.
     */
    url: string
    songs: NormalizedSong[]
}

const MAX_INPUT_LENGTH = 500
const MAX_NAME_LENGTH = 200

// Setlist ids are hex with the leading zero dropped, so 7 or 8 characters.
const SETLIST_ID = /^[0-9a-f]{7,8}$/i
// A setlist page: /setlist/<artist>/<year>/<venue-slug>-<id>.html. Artist and
// venue pages share the "-<id>.html" suffix, hence the /setlist/ anchor.
const SETLIST_PAGE_PATH = /^\/setlist\/.+-([0-9a-f]{7,8})\.html$/i
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i

function isSetlistFmHost(hostname: string): boolean {
    const host = hostname.toLowerCase()
    return host === 'setlist.fm' || host.endsWith('.setlist.fm')
}

/** Extracts a setlist id from a pasted setlist.fm page URL or a bare id. */
export function parseSetlistId(input: string): string | null {
    const value = input.trim()
    if (!value || value.length > MAX_INPUT_LENGTH) return null
    if (SETLIST_ID.test(value)) return value.toLowerCase()

    let url: URL
    try {
        url = new URL(HAS_SCHEME.test(value) ? value : `https://${value}`)
    } catch {
        return null
    }

    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!isSetlistFmHost(url.hostname)) return null

    const match = SETLIST_PAGE_PATH.exec(url.pathname)
    return match ? match[1].toLowerCase() : null
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
}

function asArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value
    return value === undefined || value === null ? [] : [value]
}

function cleanText(value: unknown): string {
    if (typeof value !== 'string') return ''
    return value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_NAME_LENGTH)
}

/** `dd-MM-yyyy` → `yyyy-MM-dd`, rejecting impossible dates like 31-02-2024. */
export function toIsoDate(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value.trim())
    if (!match) return null

    const [, dd, mm, yyyy] = match
    const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)))
    const valid =
        date.getUTCFullYear() === Number(yyyy) &&
        date.getUTCMonth() === Number(mm) - 1 &&
        date.getUTCDate() === Number(dd)

    return valid ? `${yyyy}-${mm}-${dd}` : null
}

function attributionUrl(value: unknown): string {
    if (typeof value === 'string') {
        try {
            const url = new URL(value)
            if (url.protocol === 'https:' && isSetlistFmHost(url.hostname)) return url.href
        } catch {
            // Fall through to the site root: attribution still points at setlist.fm.
        }
    }
    return SETLISTFM_SITE
}

/**
 * Maps a setlist.fm `GET /setlist/{id}` payload to the import contract.
 * Returns null when the payload lacks an artist or a valid date.
 *
 * - The live API nests sets as `sets.set[]`; the published JSON docs show a
 *   top-level `set[]`. Both are accepted.
 * - A set with `encore` ≥ 1 marks its songs as encore songs. The model only
 *   has a boolean, so a second encore reads the same as the first.
 * - `tape: true` entries (intro/outro music played from a recording) and
 *   unnamed placeholder songs are dropped: neither was performed as a song.
 */
export function normalizeSetlist(raw: unknown): NormalizedSetlist | null {
    const setlist = asRecord(raw)
    if (!setlist) return null

    const artistName = cleanText(asRecord(setlist.artist)?.name)
    const eventDate = toIsoDate(setlist.eventDate)
    if (!artistName || !eventDate) return null

    const setsNode = asRecord(setlist.sets)
    const sets = asArray(setsNode ? setsNode.set : setlist.set)

    const songs: NormalizedSong[] = []
    for (const entry of sets) {
        const set = asRecord(entry)
        if (!set) continue
        const encore = Number(set.encore) > 0

        for (const songEntry of asArray(set.song)) {
            const song = asRecord(songEntry)
            if (!song || song.tape === true) continue
            const name = cleanText(song.name)
            if (name) songs.push({ name, encore })
        }
    }

    return {
        artistName,
        eventDate,
        venueName: cleanText(asRecord(setlist.venue)?.name),
        url: attributionUrl(setlist.url),
        songs,
    }
}
