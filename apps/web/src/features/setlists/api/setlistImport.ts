import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '@/shared/lib/supabase'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS, STALE_TIMES } from '@/shared/lib/constants'
import { validateRpcResponse } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import { setlistImportSchema, type SetlistImport } from '@/shared/validation/schemas'
import {
    eventArtistKeys,
    fetchEventArtists,
    type EventArtistRef,
} from '@/features/events/api/eventArtists'

/** One row of the setlist editor, before it is saved. */
export interface SetlistSongDraft {
    /** Set when the song was picked from the catalog; imported songs are resolved on save. */
    id?: string
    /** Set when editing a saved setlist: the `setlist_songs` row this entry came from. */
    setlistSongId?: string
    name: string
    position: number
    isEncore: boolean
    isDebut: boolean
    notes: string
    /** The artist the song is filed under when it has to be created. */
    artistId?: string
}

/** An event artist a setlist.fm import may belong to. `id` is absent for line-up-only names. */
export interface ImportCandidateArtist {
    id?: string
    name: string
}

/** What the editor shows (and must attribute) after an import. */
export interface ImportedSetlistSource {
    artistName: string
    venueName: string
    eventDate: string
    url: string
    artistId?: string
    /** False when setlist.fm dates the show more than a day away from the gig. */
    sameNight: boolean
}

export interface SetlistImportResult {
    songs: SetlistSongDraft[]
    source: ImportedSetlistSource
}

export type SetlistImportMapping =
    | ({ ok: true } & SetlistImportResult)
    | { ok: false; code: 'artist_mismatch' | 'empty' }

export type SetlistImportErrorCode =
    | 'invalid_input'
    | 'not_found'
    | 'artist_mismatch'
    | 'quota_exceeded'
    | 'empty'
    | 'rate_limited'
    | 'unauthorized'
    | 'not_configured'
    | 'upstream'

export class SetlistImportError extends Error {
    readonly code: SetlistImportErrorCode
    /** setlist.fm's artist, carried for the artist-mismatch message. */
    readonly artistName?: string

    constructor(code: SetlistImportErrorCode, artistName?: string) {
        super(`setlist.fm import failed: ${code}`)
        this.name = 'SetlistImportError'
        this.code = code
        this.artistName = artistName
    }
}

// ---------------------------------------------------------------------------
// Artist matching
// ---------------------------------------------------------------------------

const JOINERS = new Set(['and', 'with', 'feat', 'featuring', 'ft'])

/** Case-, accent- and punctuation-insensitive words of an artist name, without a leading "the". */
export function artistNameTokens(name: string): string[] {
    const tokens = name
        .normalize('NFKD')
        .replace(/\p{M}+/gu, '')
        .toLowerCase()
        .replace(/[&+]/g, ' and ')
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)

    return tokens[0] === 'the' && tokens.length > 1 ? tokens.slice(1) : tokens
}

/**
 * True when two spellings name the same act. Beyond exact (normalised) equality,
 * a billing that extends a name with a joiner still matches — setlist.fm's
 * "Bruce Springsteen" against a listing's "Bruce Springsteen & The E Street
 * Band" — while a bare prefix ("Muse" vs "Museum") does not.
 */
export function artistNamesMatch(a: string, b: string): boolean {
    const ta = artistNameTokens(a)
    const tb = artistNameTokens(b)
    if (ta.length === 0 || tb.length === 0) {
        return a.trim().toLowerCase() === b.trim().toLowerCase()
    }
    if (ta.join('') === tb.join('')) return true

    const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
    return (
        long.length > short.length &&
        JOINERS.has(long[short.length]) &&
        short.every((token, i) => token === long[i])
    )
}

/** Linked artists when the event has any; otherwise the names in its line-up. */
export function buildImportCandidates(linked: EventArtistRef[], lineup: string[]): ImportCandidateArtist[] {
    if (linked.length > 0) return linked
    return lineup.filter(name => name.trim()).map(name => ({ name }))
}

/**
 * The artist a hand-written setlist's songs are filed under: the event's only
 * act. A shared bill or festival gets none — a setlist doesn't record whose set
 * it is — and so does a line-up naming an act that isn't linked. Unfiled songs
 * are only missing from artist stats; misfiled ones would count for the wrong act.
 */
export function soleArtistId(linked: EventArtistRef[], lineup: string[]): string | undefined {
    if (linked.length !== 1) return undefined
    const [artist] = linked
    const othersBilled = lineup.some(name => name.trim() && !artistNamesMatch(name, artist.name))
    return othersBilled ? undefined : artist.id
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * setlist.fm dates a show by its local calendar day; the gig's start_at is a
 * UTC instant. Venue time zones aren't stored, so a day either way is allowed.
 */
export function isSameNight(importedDate: string, eventStartAt?: string): boolean {
    if (!eventStartAt) return true
    const start = new Date(eventStartAt)
    const imported = Date.parse(`${importedDate}T00:00:00Z`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(imported)) return true

    const eventDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    return Math.abs(eventDay - imported) <= DAY_MS
}

/**
 * Maps a normalised setlist.fm import onto the editor's model: positions from
 * play order, encore flags from the set, every song filed under the matched
 * event artist so saving respects UNIQUE(name, artist_id).
 */
export function mapSetlistImport(
    imported: SetlistImport,
    candidates: ImportCandidateArtist[],
    eventStartAt?: string
): SetlistImportMapping {
    const artist = candidates.find(candidate => artistNamesMatch(candidate.name, imported.artistName))
    if (!artist) return { ok: false, code: 'artist_mismatch' }
    if (imported.songs.length === 0) return { ok: false, code: 'empty' }

    return {
        ok: true,
        songs: imported.songs.map((song, position) => ({
            name: song.name,
            position,
            isEncore: song.encore,
            isDebut: false,
            notes: '',
            artistId: artist.id,
        })),
        source: {
            artistName: imported.artistName,
            venueName: imported.venueName,
            eventDate: imported.eventDate,
            url: imported.url,
            artistId: artist.id,
            sameNight: isSameNight(imported.eventDate, eventStartAt),
        },
    }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const FUNCTION_ERROR_CODES: Record<string, SetlistImportErrorCode> = {
    invalid_input: 'invalid_input',
    not_found: 'not_found',
    quota_exceeded: 'quota_exceeded',
    unauthorized: 'unauthorized',
    not_configured: 'not_configured',
}

/** Reads the function's `{ error: { code } }` body; the gateway's own 404 means it isn't deployed. */
export function importErrorCodeFromBody(body: unknown): SetlistImportErrorCode {
    if (typeof body !== 'object' || body === null) return 'upstream'
    const { error, code } = body as { error?: { code?: unknown }; code?: unknown }
    const functionCode = error?.code
    if (typeof functionCode === 'string' && FUNCTION_ERROR_CODES[functionCode]) {
        return FUNCTION_ERROR_CODES[functionCode]
    }
    return code === 'NOT_FOUND' ? 'not_configured' : 'upstream'
}

/** The toast copy for a failed import. Names what happened and what to do next. */
export function importErrorMessage(error: unknown): string {
    if (!(error instanceof SetlistImportError)) {
        return 'Something went wrong while importing. Try again.'
    }

    switch (error.code) {
        case 'not_found':
            return "setlist.fm has no setlist at that link. Check it's the link to a setlist page."
        case 'artist_mismatch':
            return error.artistName
                ? `That setlist is for ${sanitizeText(error.artistName)}, who isn't on this gig's line-up.`
                : "That setlist is for an artist who isn't on this gig's line-up."
        case 'quota_exceeded':
            return 'setlist.fm has had too many requests from ratemygig. Try again later, or add the songs by hand.'
        case 'invalid_input':
            return "That isn't a setlist.fm setlist link. Copy the address of the setlist page and paste it here."
        case 'empty':
            return 'setlist.fm has this show, but no songs on it yet.'
        case 'rate_limited':
            return 'Give it a few seconds before importing again.'
        case 'unauthorized':
            return 'Sign in again to import from setlist.fm.'
        case 'not_configured':
            return "Importing from setlist.fm isn't set up on this server yet. Add the songs by hand for now."
        case 'upstream':
            return "Couldn't reach setlist.fm. Try again in a moment."
    }
}

// ---------------------------------------------------------------------------
// The import
// ---------------------------------------------------------------------------

export interface ImportSetlistVariables {
    /** The pasted setlist.fm link (or bare id). */
    input: string
    eventId: string
    lineup: string[]
    eventStartAt?: string
}

export interface ImportSetlistDeps {
    allow: () => boolean
    invoke: (input: string) => Promise<SetlistImport>
    fetchArtists: (eventId: string) => Promise<EventArtistRef[]>
}

export async function runSetlistImportWithDeps(
    variables: ImportSetlistVariables,
    deps: ImportSetlistDeps
): Promise<SetlistImportResult> {
    if (!deps.allow()) throw new SetlistImportError('rate_limited')

    const [imported, linked] = await Promise.all([
        deps.invoke(variables.input),
        deps.fetchArtists(variables.eventId),
    ])

    const mapping = mapSetlistImport(
        imported,
        buildImportCandidates(linked, variables.lineup),
        variables.eventStartAt
    )
    if (!mapping.ok) throw new SetlistImportError(mapping.code, imported.artistName)

    return { songs: mapping.songs, source: mapping.source }
}

const IMPORT_TIMEOUT_MS = 20000

async function invokeSetlistImport(input: string): Promise<SetlistImport> {
    const { data, error } = await supabase.functions.invoke('setlist-import', {
        body: { url: input },
        timeout: IMPORT_TIMEOUT_MS,
    })

    if (error) {
        if (error instanceof FunctionsHttpError) {
            const body = await (error.context as Response).json().catch(() => null)
            throw new SetlistImportError(importErrorCodeFromBody(body))
        }
        throw new SetlistImportError('upstream')
    }

    try {
        return validateRpcResponse(setlistImportSchema, data, 'setlist-import')
    } catch {
        throw new SetlistImportError('upstream')
    }
}

const setlistImportLimiter = createRateLimiter(RATE_LIMITS.SETLIST_IMPORT)

/**
 * Fetches a setlist.fm setlist through the setlist-import Edge Function and maps
 * it onto the editor's model. Nothing is written: the user reviews the list and
 * saves it through useCreateSetlist.
 */
export function useImportSetlist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (variables: ImportSetlistVariables) =>
            runSetlistImportWithDeps(variables, {
                allow: () => setlistImportLimiter.allow(),
                invoke: invokeSetlistImport,
                fetchArtists: eventId =>
                    queryClient.fetchQuery({
                        queryKey: eventArtistKeys.byEvent(eventId),
                        queryFn: () => fetchEventArtists(eventId),
                        staleTime: STALE_TIMES.DEFAULT,
                    }),
            }),
    })
}
