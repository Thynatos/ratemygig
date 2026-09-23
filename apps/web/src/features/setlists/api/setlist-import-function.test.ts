import { describe, expect, it, vi } from 'vitest'
import {
    normalizeSetlist,
    parseSetlistId,
    SETLISTFM_SITE,
    toIsoDate,
} from '../../../../../../supabase/functions/setlist-import/setlistfm.ts'
import {
    bearerToken,
    createSetlistImportHandler,
    retryDelayMs,
    type SetlistImportDeps,
} from '../../../../../../supabase/functions/setlist-import/handler.ts'

// supabase/functions/setlist-import is Deno code with no imports beyond its own
// files, so it runs here unchanged. These tests never touch the network.

const PAGE_URL =
    'https://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-hollywood-ca-63de4613.html'

// The shape the live API returns: sets nested under `sets.set`.
const LIVE_PAYLOAD = {
    id: '63de4613',
    eventDate: '23-08-1964',
    url: PAGE_URL,
    artist: { mbid: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d', name: 'The Beatles' },
    venue: { id: '6bd6ca6e', name: 'Hollywood Bowl', city: { name: 'Hollywood' } },
    sets: {
        set: [
            {
                song: [
                    { name: 'Intro', tape: true },
                    { name: 'Twist and Shout' },
                    { name: "  You Can't   Do\tThat " },
                    { name: '' },
                ],
            },
            { name: 'Acoustic', song: [{ name: 'Yesterday', info: 'solo' }] },
            { encore: 1, song: [{ name: 'Long Tall Sally', cover: { name: 'Little Richard' } }] },
            { encore: 2, song: [{ name: 'Twist and Shout' }] },
        ],
    },
}

const NORMALIZED_SONGS = [
    { name: 'Twist and Shout', encore: false },
    { name: "You Can't Do That", encore: false },
    { name: 'Yesterday', encore: false },
    { name: 'Long Tall Sally', encore: true },
    { name: 'Twist and Shout', encore: true },
]

describe('parseSetlistId', () => {
    it('reads the id from a setlist page URL', () => {
        expect(parseSetlistId(PAGE_URL)).toBe('63de4613')
    })

    it('accepts URLs without a scheme, with query strings, and on language subdomains', () => {
        expect(parseSetlistId('www.setlist.fm/setlist/a/2024/b-63de4613.html')).toBe('63de4613')
        expect(parseSetlistId(`${PAGE_URL}?utm_source=share#songs`)).toBe('63de4613')
        expect(parseSetlistId('https://de.setlist.fm/setlist/a/2024/b-63de4613.html')).toBe('63de4613')
    })

    it('accepts a bare id of 7 or 8 hex characters and lowercases it', () => {
        expect(parseSetlistId('  63DE4613 ')).toBe('63de4613')
        expect(parseSetlistId('3bd6d80')).toBe('3bd6d80')
    })

    it('rejects artist and venue pages, which share the -<id>.html suffix', () => {
        expect(parseSetlistId('https://www.setlist.fm/setlists/the-beatles-23d6a88b.html')).toBeNull()
        expect(parseSetlistId('https://www.setlist.fm/venue/hollywood-bowl-6bd6ca6e.html')).toBeNull()
    })

    it('rejects hosts that only look like setlist.fm', () => {
        expect(parseSetlistId('https://setlist.fm.example.com/setlist/a/b-63de4613.html')).toBeNull()
        expect(parseSetlistId('https://evilsetlist.fm/setlist/a/b-63de4613.html')).toBeNull()
    })

    it('rejects non-http schemes, junk, empty and oversized input', () => {
        expect(parseSetlistId('ftp://www.setlist.fm/setlist/a/b-63de4613.html')).toBeNull()
        expect(parseSetlistId('javascript:alert(1)')).toBeNull()
        expect(parseSetlistId('not a setlist')).toBeNull()
        expect(parseSetlistId('')).toBeNull()
        expect(parseSetlistId(`${PAGE_URL}?${'x'.repeat(600)}`)).toBeNull()
    })
})

describe('toIsoDate', () => {
    it('converts setlist.fm dd-MM-yyyy to ISO', () => {
        expect(toIsoDate('23-08-1964')).toBe('1964-08-23')
    })

    it('rejects impossible dates and other formats', () => {
        expect(toIsoDate('31-02-2024')).toBeNull()
        expect(toIsoDate('2024-02-01')).toBeNull()
        expect(toIsoDate(20240201)).toBeNull()
    })
})

describe('normalizeSetlist', () => {
    it('flattens the live sets.set shape in order, marking encore sets', () => {
        expect(normalizeSetlist(LIVE_PAYLOAD)).toEqual({
            artistName: 'The Beatles',
            eventDate: '1964-08-23',
            venueName: 'Hollywood Bowl',
            url: PAGE_URL,
            songs: NORMALIZED_SONGS,
        })
    })

    it('accepts the top-level set array shown in the published docs', () => {
        const { sets, ...rest } = LIVE_PAYLOAD
        expect(normalizeSetlist({ ...rest, set: sets.set })?.songs).toEqual(NORMALIZED_SONGS)
    })

    it('drops tape entries and unnamed placeholder songs', () => {
        const names = normalizeSetlist(LIVE_PAYLOAD)?.songs.map(s => s.name)
        expect(names).not.toContain('Intro')
        expect(names).not.toContain('')
    })

    it('returns an empty song list for a setlist with no sets yet', () => {
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, sets: {} })?.songs).toEqual([])
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, sets: undefined })?.songs).toEqual([])
    })

    it('returns null without an artist or a valid date', () => {
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, artist: {} })).toBeNull()
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, eventDate: 'sometime' })).toBeNull()
        expect(normalizeSetlist(null)).toBeNull()
        expect(normalizeSetlist([LIVE_PAYLOAD])).toBeNull()
    })

    it('only passes through https setlist.fm attribution links', () => {
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, url: 'javascript:alert(1)' })?.url).toBe(SETLISTFM_SITE)
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, url: 'https://example.com/x' })?.url).toBe(SETLISTFM_SITE)
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, url: undefined })?.url).toBe(SETLISTFM_SITE)
    })

    it('tolerates a missing venue name', () => {
        expect(normalizeSetlist({ ...LIVE_PAYLOAD, venue: null })?.venueName).toBe('')
    })
})

describe('bearerToken', () => {
    it('extracts the token from a Bearer header, case-insensitively', () => {
        expect(bearerToken('Bearer abc.def')).toBe('abc.def')
        expect(bearerToken('bearer abc.def')).toBe('abc.def')
    })

    it('rejects other schemes and empty headers', () => {
        expect(bearerToken('Basic abc')).toBeNull()
        expect(bearerToken('Bearer')).toBeNull()
        expect(bearerToken(null)).toBeNull()
    })
})

describe('retryDelayMs', () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0)

    it('waits a second when setlist.fm gives no usable Retry-After', () => {
        expect(retryDelayMs(null, now)).toBe(1000)
        expect(retryDelayMs('', now)).toBe(1000)
        expect(retryDelayMs('soon', now)).toBe(1000)
    })

    it('honours a short Retry-After in seconds or as an HTTP date', () => {
        expect(retryDelayMs('0', now)).toBe(0)
        expect(retryDelayMs('2', now)).toBe(2000)
        expect(retryDelayMs(new Date(now + 1500).toUTCString(), now)).toBe(1000)
    })

    it('does not retry when the wait means the daily quota is spent', () => {
        expect(retryDelayMs('3', now)).toBeNull()
        expect(retryDelayMs('3600', now)).toBeNull()
        expect(retryDelayMs(new Date(now + 3_600_000).toUTCString(), now)).toBeNull()
    })
})

describe('createSetlistImportHandler', () => {
    const API_KEY = 'test-setlistfm-key'

    function upstream(status: number, body?: unknown, headers?: Record<string, string>) {
        const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)
        return new Response(text, { status, headers: { 'content-type': 'application/json', ...headers } })
    }

    function setup(overrides: Partial<SetlistImportDeps> = {}, responses: Response[] = []) {
        const fetch = vi.fn(async () => {
            const next = responses.shift()
            if (!next) throw new Error('unexpected fetch')
            return next
        })
        const deps: SetlistImportDeps = {
            apiKey: API_KEY,
            verifyUser: vi.fn(async (token: string) => token === 'user-jwt'),
            fetch,
            sleep: vi.fn(async () => undefined),
            log: vi.fn(),
            ...overrides,
        }
        return { deps, fetch, handle: createSetlistImportHandler(deps) }
    }

    function post(body: unknown, authorization: string | null = 'Bearer user-jwt') {
        const headers: Record<string, string> = { 'content-type': 'application/json' }
        if (authorization) headers.authorization = authorization
        return new Request('https://project.supabase.co/functions/v1/setlist-import', {
            method: 'POST',
            headers,
            body: typeof body === 'string' ? body : JSON.stringify(body),
        })
    }

    async function errorCode(response: Response) {
        return ((await response.json()) as { error: { code: string } }).error.code
    }

    it('answers CORS preflight without auth', async () => {
        const { handle } = setup()
        const res = await handle(new Request('https://x/functions/v1/setlist-import', { method: 'OPTIONS' }))
        expect(res.status).toBe(204)
        expect(res.headers.get('access-control-allow-origin')).toBe('*')
        expect(res.headers.get('access-control-allow-headers')).toContain('authorization')
        expect(res.headers.get('access-control-allow-headers')).toContain('apikey')
    })

    it('only accepts POST', async () => {
        const { handle } = setup()
        const res = await handle(new Request('https://x/functions/v1/setlist-import'))
        expect(res.status).toBe(405)
    })

    it('refuses callers without a signed-in user token before doing anything else', async () => {
        const { handle, fetch, deps } = setup()

        const missing = await handle(post({ url: PAGE_URL }, null))
        expect(missing.status).toBe(401)
        expect(await errorCode(missing)).toBe('unauthorized')
        expect(deps.verifyUser).not.toHaveBeenCalled()

        const anonKey = await handle(post({ url: PAGE_URL }, 'Bearer sb_publishable_abc'))
        expect(anonKey.status).toBe(401)
        expect(fetch).not.toHaveBeenCalled()
    })

    it('reports a missing API key as not configured (to signed-in callers only)', async () => {
        const { handle, fetch } = setup({ apiKey: undefined })
        const res = await handle(post({ url: PAGE_URL }))
        expect(res.status).toBe(500)
        expect(await errorCode(res)).toBe('not_configured')
        expect(fetch).not.toHaveBeenCalled()
    })

    it('rejects bodies that are not JSON or carry no setlist.fm link, without spending quota', async () => {
        const { handle, fetch } = setup()

        const notJson = await handle(post('not json'))
        expect(notJson.status).toBe(400)
        expect(await errorCode(notJson)).toBe('invalid_input')

        const wrongSite = await handle(post({ url: 'https://example.com/setlist/a-63de4613.html' }))
        expect(await errorCode(wrongSite)).toBe('invalid_input')
        expect(fetch).not.toHaveBeenCalled()
    })

    it('fetches the setlist with the server-side key and returns the normalized contract', async () => {
        const { handle, fetch } = setup({}, [upstream(200, LIVE_PAYLOAD)])
        const res = await handle(post({ url: PAGE_URL }))

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({
            artistName: 'The Beatles',
            eventDate: '1964-08-23',
            venueName: 'Hollywood Bowl',
            url: PAGE_URL,
            songs: NORMALIZED_SONGS,
        })

        const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
        expect(url).toBe('https://api.setlist.fm/rest/1.0/setlist/63de4613')
        expect(init.headers).toMatchObject({ 'x-api-key': API_KEY, accept: 'application/json' })
    })

    it('accepts a bare id under the id key', async () => {
        const { handle } = setup({}, [upstream(200, LIVE_PAYLOAD)])
        expect((await handle(post({ id: '63de4613' }))).status).toBe(200)
    })

    it('never echoes the API key back to the caller', async () => {
        const { handle } = setup({}, [upstream(200, LIVE_PAYLOAD)])
        const text = await (await handle(post({ url: PAGE_URL }))).text()
        expect(text).not.toContain(API_KEY)
    })

    it('maps a setlist.fm 404 to not_found', async () => {
        const { handle } = setup({}, [upstream(404, { code: 404, message: 'not found' })])
        const res = await handle(post({ url: PAGE_URL }))
        expect(res.status).toBe(404)
        expect(await errorCode(res)).toBe('not_found')
    })

    it('retries a 429 burst once and succeeds', async () => {
        const { handle, fetch, deps } = setup({}, [upstream(429), upstream(200, LIVE_PAYLOAD)])
        const res = await handle(post({ url: PAGE_URL }))
        expect(res.status).toBe(200)
        expect(fetch).toHaveBeenCalledTimes(2)
        expect(deps.sleep).toHaveBeenCalledWith(1000)
    })

    it('reports quota_exceeded when the retry is throttled too', async () => {
        const { handle, fetch } = setup({}, [upstream(429), upstream(429)])
        const res = await handle(post({ url: PAGE_URL }))
        expect(res.status).toBe(429)
        expect(await errorCode(res)).toBe('quota_exceeded')
        expect(fetch).toHaveBeenCalledTimes(2)
    })

    it('does not retry when Retry-After says the daily quota is spent', async () => {
        const { handle, fetch, deps } = setup({}, [upstream(429, undefined, { 'retry-after': '3600' })])
        const res = await handle(post({ url: PAGE_URL }))
        expect(await errorCode(res)).toBe('quota_exceeded')
        expect(fetch).toHaveBeenCalledTimes(1)
        expect(deps.sleep).not.toHaveBeenCalled()
    })

    it('treats a rejected API key as a configuration problem and logs it', async () => {
        const { handle, deps } = setup({}, [upstream(403, { message: 'Forbidden' })])
        const res = await handle(post({ url: PAGE_URL }))
        expect(res.status).toBe(502)
        expect(await errorCode(res)).toBe('not_configured')
        expect(deps.log).toHaveBeenCalled()
    })

    it('maps other upstream failures to upstream_error', async () => {
        const serverError = setup({}, [upstream(500)])
        expect(await errorCode(await serverError.handle(post({ url: PAGE_URL })))).toBe('upstream_error')

        const notJson = setup({}, [upstream(200, '<html>maintenance</html>')])
        expect(await errorCode(await notJson.handle(post({ url: PAGE_URL })))).toBe('upstream_error')

        const noArtist = setup({}, [upstream(200, { ...LIVE_PAYLOAD, artist: null })])
        expect(await errorCode(await noArtist.handle(post({ url: PAGE_URL })))).toBe('upstream_error')
    })

    it('maps a network failure or timeout to upstream_error', async () => {
        const { handle } = setup({
            fetch: vi.fn(async () => {
                throw new DOMException('The operation timed out.', 'TimeoutError')
            }),
        })
        const res = await handle(post({ url: PAGE_URL }))
        expect(res.status).toBe(502)
        expect(await errorCode(res)).toBe('upstream_error')
    })
})
