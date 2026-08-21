import type { VercelRequest, VercelResponse } from '@vercel/node'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { buildOgImageUrl, buildOgTags, type OgReviewData } from '../src/shared/lib/og'
import { isCrawlerUserAgent } from '../src/shared/lib/crawler'

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
