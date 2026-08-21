import { useEffect } from 'react'

const BASELINE_TITLE = 'ratemygig - Concert Rating Platform'
const BASELINE_DESCRIPTION =
    'Discover upcoming concerts, rate your gig experiences, and explore venue and artist ratings.'
const TITLE_SUFFIX = '| ratemygig'

export interface PageMeta {
    title: string
    description?: string
    canonicalPath?: string
    ogImage?: string
}

function upsertMeta(keyedAttr: 'name' | 'property', key: string, content: string): void {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${keyedAttr}="${key}"]`)
    if (!el) {
        el = document.createElement('meta')
        el.setAttribute(keyedAttr, key)
        document.head.appendChild(el)
    }
    el.setAttribute('content', content)
}

function removeMeta(keyedAttr: 'name' | 'property', key: string): void {
    document.head.querySelector(`meta[${keyedAttr}="${key}"]`)?.remove()
}

function upsertCanonical(href: string): void {
    let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', 'canonical')
        document.head.appendChild(el)
    }
    el.setAttribute('href', href)
}

function removeCanonical(): void {
    document.head.querySelector('link[rel="canonical"]')?.remove()
}

export function restoreBaselineMeta(): void {
    document.title = BASELINE_TITLE
    upsertMeta('name', 'description', BASELINE_DESCRIPTION)
    removeCanonical()
    removeMeta('property', 'og:title')
    removeMeta('property', 'og:description')
    removeMeta('property', 'og:image')
}

export function usePageMeta(meta: PageMeta | null): void {
    useEffect(() => {
        if (!meta) {
            restoreBaselineMeta()
            return
        }

        document.title = `${meta.title} ${TITLE_SUFFIX}`
        upsertMeta('name', 'description', meta.description ?? BASELINE_DESCRIPTION)

        if (meta.canonicalPath) {
            upsertCanonical(`${window.location.origin}${meta.canonicalPath}`)
        } else {
            removeCanonical()
        }

        upsertMeta('property', 'og:title', meta.title)
        if (meta.description) {
            upsertMeta('property', 'og:description', meta.description)
        } else {
            removeMeta('property', 'og:description')
        }
        if (meta.ogImage) {
            upsertMeta('property', 'og:image', meta.ogImage)
        } else {
            removeMeta('property', 'og:image')
        }

        return restoreBaselineMeta
    }, [meta])
}
