import { describe, it, expect } from 'vitest'
import {
    buildOgTags,
    buildOgImageUrl,
    buildOgDescription,
    escapeHtmlAttribute,
    truncateText,
    type OgReviewData,
} from './og'

const baseData: OgReviewData = {
    reviewId: '11111111-2222-3333-4444-555555555555',
    title: 'Review of Test Event',
    eventName: 'Test Event',
    artistName: 'Test Artist',
    venueAndCity: 'Test Venue, Berlin',
    rating: 4,
    authorName: 'Jane',
    photoUrl: null,
}

describe('escapeHtmlAttribute', () => {
    it('escapes HTML-special characters', () => {
        expect(escapeHtmlAttribute('a"b')).toBe('a&quot;b')
        expect(escapeHtmlAttribute('a<b')).toBe('a&lt;b')
        expect(escapeHtmlAttribute('a>b')).toBe('a&gt;b')
        expect(escapeHtmlAttribute("a'b")).toBe('a&#39;b')
        expect(escapeHtmlAttribute('a&b')).toBe('a&amp;b')
    })

    it('escapes an injection attempt', () => {
        const evil = '"><script>alert(1)</script>'
        const escaped = escapeHtmlAttribute(evil)
        expect(escaped).not.toContain('<script')
        expect(escaped).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;')
    })
})

describe('buildOgDescription', () => {
    it('renders author, event, and rating copy', () => {
        expect(buildOgDescription(baseData)).toBe('Jane rated Test Event 4/5')
    })

    it('renders 5/5 style copy for top rating', () => {
        expect(buildOgDescription({ ...baseData, rating: 5 })).toBe('Jane rated Test Event 5/5')
    })

    it('truncates to at most 200 characters', () => {
        const long = 'a'.repeat(300)
        const description = buildOgDescription({ ...baseData, eventName: long })
        expect(description.length).toBeLessThanOrEqual(200)
        expect(description.endsWith('...')).toBe(true)
    })
})

describe('truncateText', () => {
    it('returns short strings unchanged', () => {
        expect(truncateText('short', 200)).toBe('short')
    })

    it('truncates long strings with ellipsis within the limit', () => {
        const result = truncateText('a'.repeat(250), 200)
        expect(result.length).toBe(200)
        expect(result.endsWith('...')).toBe(true)
    })
})

describe('buildOgTags', () => {
    it('contains og:title, og:image, and twitter:card summary_large_image', () => {
        const tags = buildOgTags(baseData, 'https://example.supabase.co/functions/v1/og-image?reviewId=abc')
        expect(tags).toContain('<meta property="og:title" content="Review of Test Event" />')
        expect(tags).toContain(
            '<meta property="og:image" content="https://example.supabase.co/functions/v1/og-image?reviewId=abc" />'
        )
        expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />')
        expect(tags).toContain('<meta name="twitter:title" content="Review of Test Event" />')
        expect(tags).toContain('<meta name="twitter:image" content="https://example.supabase.co/functions/v1/og-image?reviewId=abc" />')
    })

    it('includes og:description with rating copy and og:url with the review path', () => {
        const tags = buildOgTags(baseData)
        expect(tags).toContain('<meta property="og:description" content="Jane rated Test Event 4/5" />')
        expect(tags).toContain('<meta property="og:url" content="/r/11111111-2222-3333-4444-555555555555" />')
        expect(tags).toContain('<meta property="og:type" content="article" />')
    })

    it('falls back to photoUrl when no ogImageUrl is given', () => {
        const tags = buildOgTags({ ...baseData, photoUrl: 'https://cdn.example.com/photo.jpg' })
        expect(tags).toContain('<meta property="og:image" content="https://cdn.example.com/photo.jpg" />')
    })

    it('omits image tags when neither ogImageUrl nor photoUrl exist', () => {
        const tags = buildOgTags(baseData)
        expect(tags).not.toContain('og:image')
        expect(tags).not.toContain('twitter:image')
    })

    it('HTML-attribute-escapes user-generated values', () => {
        const tags = buildOgTags(
            {
                ...baseData,
                title: 'Evil "Title" <script>',
                eventName: 'Evil "Event"',
                authorName: 'Ann & Bob',
            },
            'https://example.com/img?x=1'
        )
        expect(tags).toContain('content="Evil &quot;Title&quot; &lt;script&gt;"')
        expect(tags).toContain('content="Ann &amp; Bob rated Evil &quot;Event&quot; 4/5"')
        expect(tags).not.toContain('<script>')
    })

    it('keeps description at or under 200 characters after escaping', () => {
        const tags = buildOgTags({ ...baseData, authorName: 'b'.repeat(150), eventName: 'e'.repeat(150) })
        const match = tags.match(/<meta property="og:description" content="([^"]*)" \/>/)
        expect(match).not.toBeNull()
        expect(match![1].length).toBeLessThanOrEqual(200)
    })

    it('keeps description at or under 200 characters even when values expand on escaping', () => {
        const tags = buildOgTags({ ...baseData, authorName: '&'.repeat(150), eventName: '"'.repeat(150) })
        const match = tags.match(/<meta property="og:description" content="([^"]*)" \/>/)
        expect(match).not.toBeNull()
        expect(match![1].length).toBeLessThanOrEqual(200)
    })
})

describe('buildOgImageUrl', () => {
    it('builds the function URL with encoded reviewId', () => {
        const url = buildOgImageUrl('https://lpfyzjfqyyrdknzgxoul.supabase.co', '11111111-2222-3333-4444-555555555555')
        expect(url).toBe(
            'https://lpfyzjfqyyrdknzgxoul.supabase.co/functions/v1/og-image?reviewId=11111111-2222-3333-4444-555555555555'
        )
    })

    it('encodes special characters in the reviewId', () => {
        const url = buildOgImageUrl('https://example.supabase.co', 'abc/def ghi')
        expect(url).toBe('https://example.supabase.co/functions/v1/og-image?reviewId=abc%2Fdef%20ghi')
    })

    it('is safe against a trailing slash on the base URL', () => {
        const url = buildOgImageUrl('https://example.supabase.co/', 'abc')
        expect(url).toBe('https://example.supabase.co/functions/v1/og-image?reviewId=abc')
    })
})
