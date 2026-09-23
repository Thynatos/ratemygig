// Request handling for setlist-import, with every side effect injected so the
// vitest suite can drive it without Deno or the network. index.ts wires the
// real dependencies.

import { normalizeSetlist, parseSetlistId, SETLISTFM_API_BASE } from './setlistfm.ts'

export type SetlistImportErrorCode =
    | 'method_not_allowed'
    | 'unauthorized'
    | 'not_configured'
    | 'invalid_input'
    | 'not_found'
    | 'quota_exceeded'
    | 'upstream_error'

export interface SetlistImportDeps {
    /** setlist.fm API key; lives only in Edge Function secrets. */
    apiKey: string | undefined
    /** Resolves true when the bearer token belongs to a signed-in user. */
    verifyUser: (token: string) => Promise<boolean>
    fetch: (url: string, init: RequestInit) => Promise<Response>
    sleep?: (ms: number) => Promise<void>
    log?: (message: string, detail?: unknown) => void
}

export const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UPSTREAM_TIMEOUT_MS = 8000
const DEFAULT_RETRY_MS = 1000
// setlist.fm answers 429 both for a per-second burst and for an exhausted daily
// quota. A short Retry-After (or none) is worth one retry; a long one is the
// daily quota and is reported straight away.
const MAX_RETRY_WAIT_MS = 2000

function json(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
}

function fail(status: number, code: SetlistImportErrorCode, message: string): Response {
    return json(status, { error: { code, message } })
}

export function bearerToken(header: string | null): string | null {
    const match = header ? /^Bearer\s+(\S+)$/i.exec(header.trim()) : null
    return match ? match[1] : null
}

/** How long to wait before retrying a 429, or null when it isn't worth retrying. */
export function retryDelayMs(retryAfter: string | null, now: number = Date.now()): number | null {
    if (retryAfter === null || retryAfter.trim() === '') return DEFAULT_RETRY_MS

    const seconds = Number(retryAfter)
    const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - now
    if (Number.isNaN(ms)) return DEFAULT_RETRY_MS

    const wait = Math.max(0, ms)
    return wait <= MAX_RETRY_WAIT_MS ? wait : null
}

async function discard(response: Response): Promise<void> {
    await response.body?.cancel().catch(() => undefined)
}

function readSetlistInput(body: unknown): string {
    if (typeof body !== 'object' || body === null) return ''
    const { url, id } = body as { url?: unknown; id?: unknown }
    if (typeof url === 'string') return url
    return typeof id === 'string' ? id : ''
}

export function createSetlistImportHandler(deps: SetlistImportDeps): (req: Request) => Promise<Response> {
    const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))

    const requestSetlist = (setlistId: string, apiKey: string) =>
        deps.fetch(`${SETLISTFM_API_BASE}/setlist/${setlistId}`, {
            headers: { 'x-api-key': apiKey, accept: 'application/json', 'accept-language': 'en' },
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        })

    return async function handle(req: Request): Promise<Response> {
        if (req.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS })
        }
        if (req.method !== 'POST') {
            return fail(405, 'method_not_allowed', 'Use POST.')
        }

        // Signed-in users only: the setlist.fm quota is shared by every user of the app.
        const token = bearerToken(req.headers.get('authorization'))
        if (!token || !(await deps.verifyUser(token))) {
            return fail(401, 'unauthorized', 'Sign in to import a setlist.')
        }

        if (!deps.apiKey) {
            deps.log?.('SETLISTFM_API_KEY is not set')
            return fail(500, 'not_configured', 'setlist.fm import is not configured.')
        }

        let body: unknown
        try {
            body = await req.json()
        } catch {
            return fail(400, 'invalid_input', 'Send JSON: { "url": "<setlist.fm setlist URL or id>" }.')
        }

        const setlistId = parseSetlistId(readSetlistInput(body))
        if (!setlistId) {
            return fail(400, 'invalid_input', 'Expected a setlist.fm setlist URL or id.')
        }

        let upstream: Response
        try {
            upstream = await requestSetlist(setlistId, deps.apiKey)
            if (upstream.status === 429) {
                const wait = retryDelayMs(upstream.headers.get('retry-after'))
                if (wait !== null) {
                    await discard(upstream)
                    await sleep(wait)
                    upstream = await requestSetlist(setlistId, deps.apiKey)
                }
            }
        } catch (error) {
            deps.log?.('setlist.fm request failed', error)
            return fail(502, 'upstream_error', 'setlist.fm did not respond.')
        }

        if (!upstream.ok) {
            await discard(upstream)
            if (upstream.status === 404 || upstream.status === 400) {
                return fail(404, 'not_found', 'setlist.fm has no setlist with that id.')
            }
            if (upstream.status === 429) {
                return fail(429, 'quota_exceeded', 'setlist.fm request quota exceeded.')
            }
            if (upstream.status === 401 || upstream.status === 403) {
                deps.log?.(`setlist.fm rejected the API key (HTTP ${upstream.status})`)
                return fail(502, 'not_configured', 'setlist.fm rejected the API key.')
            }
            deps.log?.(`setlist.fm returned HTTP ${upstream.status}`)
            return fail(502, 'upstream_error', `setlist.fm returned HTTP ${upstream.status}.`)
        }

        let payload: unknown
        try {
            payload = await upstream.json()
        } catch {
            return fail(502, 'upstream_error', 'setlist.fm sent a response that is not JSON.')
        }

        const setlist = normalizeSetlist(payload)
        if (!setlist) {
            deps.log?.('setlist.fm payload had no artist or date', { setlistId })
            return fail(502, 'upstream_error', 'setlist.fm sent a setlist without an artist or date.')
        }

        return json(200, setlist)
    }
}
