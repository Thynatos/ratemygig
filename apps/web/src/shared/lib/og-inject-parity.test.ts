import { describe, expect, it } from 'vitest'
import * as shared from './og'
import * as sharedCrawler from './crawler'
import * as fn from '../../../api/og-inject'

// api/og-inject.ts must not import from src/**: apps/web is "type": "module",
// so the Vercel Node runtime resolves relative specifiers with Node's ESM
// resolver, which cannot load src/*.ts (never emitted as .js on disk). Doing so
// made every invocation fail at module load. The function therefore carries its
// own copy of these pure helpers; this suite fails the moment they drift.

const SAMPLE: shared.OgReviewData = {
    reviewId: 'f9f9fe86-354a-4f6b-8000-5b42b83d7708',
    title: 'Review of Arctic Monkeys - The Car Tour',
    eventName: 'Arctic Monkeys - The Car Tour',
    artistName: null,
    venueAndCity: null,
    rating: 5,
    authorName: 'Anonymous',
    photoUrl: null,
}

const NASTY: shared.OgReviewData = {
    ...SAMPLE,
    title: `<script>alert("x")</script> & 'quotes'`,
    eventName: 'A'.repeat(400),
    authorName: `O'Brien & <b>co</b>`,
}

// Exercises the OG_TITLE_FALLBACK constant, which is only reachable with an
// empty title — without this case, drift in that constant goes undetected.
const NO_TITLE: shared.OgReviewData = { ...SAMPLE, title: '' }

const CASES: [string, shared.OgReviewData][] = [
    ['sample', SAMPLE],
    ['nasty', NASTY],
    ['no-title', NO_TITLE],
]

describe('api/og-inject stays in parity with src/shared/lib', () => {
    it('escapeHtmlAttribute matches', () => {
        for (const input of ['plain', `<a href="x">&'`, '', 'ünïcode']) {
            expect(fn.escapeHtmlAttribute(input)).toBe(shared.escapeHtmlAttribute(input))
        }
    })

    it('truncateText matches', () => {
        for (const [value, max] of [['short', 10], ['exactly-ten', 11], ['a'.repeat(50), 20], ['abc', 2]] as const) {
            expect(fn.truncateText(value, max)).toBe(shared.truncateText(value, max))
        }
    })

    it.each(CASES)('buildOgDescription matches (%s)', (_label, data) => {
        expect(fn.buildOgDescription(data)).toBe(shared.buildOgDescription(data))
    })

    it.each(CASES)('buildOgTags matches (%s), with and without an image url', (_label, data) => {
        expect(fn.buildOgTags(data)).toBe(shared.buildOgTags(data))

        const img = 'https://example.supabase.co/functions/v1/og-image?reviewId=abc'
        expect(fn.buildOgTags(data, img)).toBe(shared.buildOgTags(data, img))
    })

    it('buildOgTags output is non-trivial, so parity is a real assertion', () => {
        const tags = fn.buildOgTags(SAMPLE, 'https://x/og.png')
        expect(tags).toContain('og:title')
        expect(tags).toContain('og:image')
        expect(tags).toContain('twitter:card')
        expect(fn.buildOgTags(NO_TITLE)).toContain('ratemygig Review')
    })

    it('buildOgImageUrl matches, with and without a trailing slash', () => {
        for (const base of ['https://x.supabase.co', 'https://x.supabase.co/']) {
            expect(fn.buildOgImageUrl(base, SAMPLE.reviewId)).toBe(
                shared.buildOgImageUrl(base, SAMPLE.reviewId)
            )
        }
    })

    it('crawler regex is byte-identical, not merely similar', () => {
        expect(fn.CRAWLER_UA_PATTERN.source).toBe(sharedCrawler.CRAWLER_UA_PATTERN.source)
        expect(fn.CRAWLER_UA_PATTERN.flags).toBe(sharedCrawler.CRAWLER_UA_PATTERN.flags)
    })

    it('isCrawlerUserAgent matches for every token in the shared pattern', () => {
        // Derived from the pattern itself so that removing any alternative from
        // one copy is caught automatically — a hand-written UA list silently
        // missed a dropped token during review.
        const tokens = sharedCrawler.CRAWLER_UA_PATTERN.source.split('|')
        expect(tokens.length).toBeGreaterThan(10)

        for (const token of tokens) {
            for (const ua of [token, token.toUpperCase(), token.toLowerCase(), `Mozilla/5.0 (${token}/1.0)`]) {
                expect(sharedCrawler.isCrawlerUserAgent(ua), `shared should match ${ua}`).toBe(true)
                expect(fn.isCrawlerUserAgent(ua), `api copy should match ${ua}`).toBe(true)
            }
        }
    })

    it('isCrawlerUserAgent matches on browser agents and empty input', () => {
        const nonCrawlers = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1',
            '',
        ]
        for (const ua of nonCrawlers) {
            expect(fn.isCrawlerUserAgent(ua)).toBe(sharedCrawler.isCrawlerUserAgent(ua))
            expect(fn.isCrawlerUserAgent(ua)).toBe(false)
        }
        expect(fn.isCrawlerUserAgent(null)).toBe(sharedCrawler.isCrawlerUserAgent(null))
        expect(fn.isCrawlerUserAgent(undefined)).toBe(sharedCrawler.isCrawlerUserAgent(undefined))
    })

    it('vercel.json crawler rewrite carries the same tokens (documented manual-sync hazard)', async () => {
        const { readFileSync } = await import('node:fs')
        const { join } = await import('node:path')
        const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf-8'))
        const rule = config.rewrites.find((r: { has?: unknown[] }) => Array.isArray(r.has))
        const uaValue: string = rule.has[0].value

        for (const token of sharedCrawler.CRAWLER_UA_PATTERN.source.split('|')) {
            expect(uaValue, `vercel.json UA gate is missing "${token}"`).toContain(token)
        }
        expect(uaValue.startsWith('(?i)'), 'vercel.json UA gate must be case-insensitive').toBe(true)
    })
})

describe('api/og-inject has no cross-directory runtime imports', () => {
    it('imports only node builtins and type-only @vercel/node', async () => {
        const { readFileSync } = await import('node:fs')
        const { join } = await import('node:path')
        // jsdom makes import.meta.url an http:// URL, so resolve from the
        // vitest cwd (apps/web) instead of the module URL.
        const source = readFileSync(join(process.cwd(), 'api', 'og-inject.ts'), 'utf-8')
        const specifiers = [...source.matchAll(/^import\s+(?:type\s+)?[^'"]*from\s+'([^']+)'/gm)].map(m => m[1])
        const runtimeSpecifiers = [...source.matchAll(/^import\s+(?!type\s)[^'"]*from\s+'([^']+)'/gm)].map(m => m[1])

        expect(specifiers).toContain('@vercel/node')
        expect(runtimeSpecifiers.every(s => s.startsWith('node:'))).toBe(true)
        expect(specifiers.some(s => s.includes('../src/'))).toBe(false)
    })
})
