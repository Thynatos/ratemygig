import DOMPurifyModule from 'dompurify'

// DOMPurify needs a window/DOM to work.
// In the browser (Vite), the default export is a singleton with sanitize().
// In Node.js/tests, the default export is createDOMPurify which needs a window.
let _purify: { sanitize: (input: string, config?: Record<string, unknown>) => string } | null = null

function getPurify() {
    if (_purify) return _purify

    const mod = DOMPurifyModule as unknown

    if (mod && typeof (mod as Record<string, unknown>).sanitize === 'function') {
        // Browser environment: singleton object
        _purify = mod as { sanitize: (input: string, config?: Record<string, unknown>) => string }
        return _purify
    }

    if (typeof mod === 'function') {
        // Node.js/test environment: createDOMPurify function
        const win = typeof window !== 'undefined' && window.document ? window : undefined
        // @ts-expect-error dompurify exports createDOMPurify in Node
        const instance = win ? mod(win) : mod()
        if (instance && typeof instance.sanitize === 'function') {
            _purify = instance
            return _purify
        }
    }

    throw new Error('DOMPurify could not be initialized')
}

const ALLOWED_TAGS: string[] = []
const ALLOWED_ATTR: string[] = []

export function sanitizeHtml(dirty: string): string {
    return getPurify().sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
    })
}

export function sanitizeText(input: string): string {
    return getPurify().sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    })
}

export function sanitizeRichText(dirty: string): string {
    return getPurify().sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ADD_ATTR: ['target'],
    })
}
