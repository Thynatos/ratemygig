import type { VercelRequest, VercelResponse } from '@vercel/node'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// This function is deliberately SELF-CONTAINED: it must not import from
// ../src/**. apps/web/package.json declares "type": "module", so the Vercel
// Node runtime resolves relative specifiers with Node's ESM resolver — which
// cannot load the TypeScript sources under src/ (they are only ever compiled
// by Vite for the browser bundle, never emitted as .js on disk). Importing
// them made every invocation fail at module load with
// FUNCTION_INVOCATION_FAILED, including the request-validation path.
// The helpers below mirror src/shared/lib/og.ts and src/shared/lib/crawler.ts;
// api/og-inject.parity.test.ts fails if the two ever drift.

export const CRAWLER_UA_PATTERN =
    /bot|crawl|spider|slurp|facebookexternalhit|Twitterbot|Slackbot|LinkedInBot|Discordbot|WhatsApp|TelegramBot|Pinterest|embed|preview/i

const OG_DESCRIPTION_MAX_LENGTH = 200
const OG_TITLE_FALLBACK = 'ratemygig Review'

export interface OgReviewData {
    reviewId: string
    title: string
    eventName: string
    artistName: string | null
    venueAndCity: string | null
    rating: number
    authorName: string
    photoUrl: string | null
}

export function isCrawlerUserAgent(ua: string | null | undefined): boolean {
    if (!ua) return false
    return CRAWLER_UA_PATTERN.test(ua)
}

export function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

export function truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value
    return value.slice(0, Math.max(0, maxLength - 3)) + '...'
}

export function buildOgDescription(data: OgReviewData): string {
    const raw = `${data.authorName} rated ${data.eventName} ${data.rating}/5`
    return truncateText(raw, OG_DESCRIPTION_MAX_LENGTH)
}

function escapeWithinLimit(value: string, maxLength: number): string {
    let limit = maxLength
    let escaped = escapeHtmlAttribute(truncateText(value, limit))
    while (escaped.length > maxLength && limit > 0) {
        limit -= escaped.length - maxLength
        escaped = escapeHtmlAttribute(truncateText(value, limit))
    }
    return escaped
}

export function buildOgTags(data: OgReviewData, ogImageUrl?: string): string {
    const title = escapeHtmlAttribute(data.title || OG_TITLE_FALLBACK)
    const description = escapeWithinLimit(buildOgDescription(data), OG_DESCRIPTION_MAX_LENGTH)
    const url = escapeHtmlAttribute(`/r/${data.reviewId}`)
    const image = ogImageUrl ?? data.photoUrl

    const tags = [
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
    ]

    if (image) {
        const escapedImage = escapeHtmlAttribute(image)
        tags.push(`<meta property="og:image" content="${escapedImage}" />`)
        tags.push(`<meta name="twitter:image" content="${escapedImage}" />`)
    }

    tags.push(
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:type" content="article" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${title}" />`,
        `<meta name="twitter:description" content="${description}" />`
    )

    return tags.join('\n    ')
}

export function buildOgImageUrl(baseUrl: string, reviewId: string): string {
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${base}/functions/v1/og-image?reviewId=${encodeURIComponent(reviewId)}`
}

interface RestReview {
    id: string
    title: string | null
    rating: number
    user_id: string
    event: { name: string | null; city: string | null } | null
}

interface RestProfile {
    display_name: string | null
    username: string | null
}

function readOgShell(): string | null {
    const candidates = [
        path.join(process.cwd(), 'dist', 'og-shell.html'),
        path.join(process.cwd(), 'og-shell.html'),
    ]
    for (const candidate of candidates) {
        if (existsSync(candidate)) return readFileSync(candidate, 'utf-8')
    }
    return null
}

function minimalRedirectHtml(reviewId: string): string {
    return `<!doctype html><html><head><meta http-equiv="refresh" content="0; url=/r/${encodeURIComponent(
        reviewId
    )}"></head><body></body></html>`
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<unknown> {
    const response = await fetch(url, { headers })
    if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`)
    return response.json()
}

async function buildReviewTags(reviewId: string): Promise<string | null> {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return null

    const headers = { apikey: supabaseAnonKey, authorization: `Bearer ${supabaseAnonKey}` }
    const select = 'id,title,rating,user_id,event:event_id(name,city)'
    const reviewsUrl = `${supabaseUrl}/rest/v1/reviews?id=eq.${encodeURIComponent(
        reviewId
    )}&status=eq.published&is_public=eq.true&select=${encodeURIComponent(select)}`
    const reviews = (await fetchJson(reviewsUrl, headers)) as RestReview[]
    const review = reviews[0]
    if (!review) return null

    let authorName = 'Anonymous'
    if (review.user_id) {
        const profilesUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(
            review.user_id
        )}&select=display_name,username`
        const profiles = (await fetchJson(profilesUrl, headers)) as RestProfile[]
        authorName = profiles[0]?.display_name || profiles[0]?.username || 'Anonymous'
    }

    const eventName = review.event?.name || review.title || 'an event'
    const data: OgReviewData = {
        reviewId: review.id,
        title: review.event?.name ? `Review of ${review.event.name}` : review.title || 'Review',
        eventName,
        artistName: null,
        venueAndCity: null,
        rating: review.rating,
        authorName,
        photoUrl: null,
    }
    return buildOgTags(data, buildOgImageUrl(supabaseUrl, review.id))
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
    const rawReviewId = req.query.reviewId
    const reviewId = Array.isArray(rawReviewId) ? rawReviewId[0] : rawReviewId
    if (!reviewId || typeof reviewId !== 'string') {
        res.status(400).send('Missing reviewId parameter')
        return
    }

    if (!isCrawlerUserAgent(req.headers['user-agent'])) {
        res.redirect(302, `/r/${encodeURIComponent(reviewId)}`)
        return
    }

    let tags: string | null = null
    try {
        tags = await buildReviewTags(reviewId)
    } catch (error) {
        console.error('og-inject failed to build tags:', error)
    }

    const shell = readOgShell() ?? minimalRedirectHtml(reviewId)
    const html = tags ? shell.replace(/<\/head>/i, () => `    ${tags}\n</head>`) : shell

    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.setHeader('cache-control', 'public, max-age=600, s-maxage=3600')
    res.send(html)
}
