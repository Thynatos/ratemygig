import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePageMeta, type PageMeta } from './usePageMeta'

const BASELINE_TITLE = 'ratemygig - Concert Rating Platform'
const BASELINE_DESCRIPTION =
    'Discover upcoming concerts, rate your gig experiences, and explore venue and artist ratings.'

function getMeta(attr: 'name' | 'property', key: string): HTMLMetaElement | null {
    return document.head.querySelector(`meta[${attr}="${key}"]`)
}

describe('usePageMeta', () => {
    beforeEach(() => {
        document.title = BASELINE_TITLE
        document.head.innerHTML = ''
    })

    afterEach(() => {
        document.head.innerHTML = ''
    })

    it('sets document.title with the site suffix', () => {
        renderHook(() => usePageMeta({ title: 'Test Event' }))
        expect(document.title).toBe('Test Event | ratemygig')
    })

    it('creates meta[name=description] when absent and updates it when present', () => {
        const { rerender } = renderHook(({ meta }: { meta: PageMeta | null }) => usePageMeta(meta), {
            initialProps: { meta: { title: 'Page', description: 'First description' } },
        })
        let description = getMeta('name', 'description')
        expect(description).not.toBeNull()
        expect(description!.getAttribute('content')).toBe('First description')
        expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1)

        rerender({ meta: { title: 'Page', description: 'Second description' } })
        description = getMeta('name', 'description')
        expect(document.head.querySelectorAll('meta[name="description"]').length).toBe(1)
        expect(description!.getAttribute('content')).toBe('Second description')
    })

    it('updates a pre-existing stale meta description in place without duplicating it', () => {
        const stale = document.createElement('meta')
        stale.setAttribute('name', 'description')
        stale.setAttribute('content', 'stale content')
        document.head.appendChild(stale)

        renderHook(() => usePageMeta({ title: 'Page', description: 'Fresh description' }))
        const descriptions = document.head.querySelectorAll('meta[name="description"]')
        expect(descriptions.length).toBe(1)
        expect(descriptions[0]).toBe(stale)
        expect(descriptions[0].getAttribute('content')).toBe('Fresh description')
    })

    it('sets the canonical link and removes it when canonicalPath is omitted', () => {
        const { rerender } = renderHook<void, { meta: PageMeta | null }>(({ meta }) => usePageMeta(meta), {
            initialProps: { meta: { title: 'Page', canonicalPath: '/r/123' } },
        })
        const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        expect(canonical).not.toBeNull()
        expect(canonical!.getAttribute('href')).toBe(`${window.location.origin}/r/123`)

        rerender({ meta: { title: 'Page' } })
        expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    })

    it('restores baseline title/description and removes canonical when meta is null', () => {
        const { rerender } = renderHook<void, { meta: PageMeta | null }>(({ meta }) => usePageMeta(meta), {
            initialProps: { meta: { title: 'Some Review', description: 'A review', canonicalPath: '/r/123' } },
        })
        expect(document.title).toBe('Some Review | ratemygig')

        rerender({ meta: null })
        expect(document.title).toBe(BASELINE_TITLE)
        const description = getMeta('name', 'description')
        expect(description).not.toBeNull()
        expect(description!.getAttribute('content')).toBe(BASELINE_DESCRIPTION)
        expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
    })

    it('upserts og:image when provided and removes it when not', () => {
        const { rerender } = renderHook<void, { meta: PageMeta | null }>(({ meta }) => usePageMeta(meta), {
            initialProps: { meta: { title: 'Page', ogImage: 'https://example.com/image.png' } },
        })
        let image = getMeta('property', 'og:image')
        expect(image).not.toBeNull()
        expect(image!.getAttribute('content')).toBe('https://example.com/image.png')

        rerender({ meta: { title: 'Page' } })
        expect(getMeta('property', 'og:image')).toBeNull()

        rerender({ meta: { title: 'Page', ogImage: 'https://example.com/other.png' } })
        image = getMeta('property', 'og:image')
        expect(image).not.toBeNull()
        expect(image!.getAttribute('content')).toBe('https://example.com/other.png')
    })

    it('restores baseline meta when the component unmounts', () => {
        const { unmount } = renderHook(() =>
            usePageMeta({ title: 'Some Review', description: 'A review', canonicalPath: '/r/123', ogImage: 'https://example.com/i.png' })
        )
        expect(document.title).toBe('Some Review | ratemygig')
        expect(document.head.querySelector('link[rel="canonical"]')).not.toBeNull()
        expect(getMeta('property', 'og:image')).not.toBeNull()

        unmount()
        expect(document.title).toBe(BASELINE_TITLE)
        const description = getMeta('name', 'description')
        expect(description).not.toBeNull()
        expect(description!.getAttribute('content')).toBe(BASELINE_DESCRIPTION)
        expect(document.head.querySelector('link[rel="canonical"]')).toBeNull()
        expect(getMeta('property', 'og:image')).toBeNull()
        expect(getMeta('property', 'og:title')).toBeNull()
    })
})
