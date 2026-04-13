import DOMPurify from 'dompurify'

const ALLOWED_TAGS: string[] = []
const ALLOWED_ATTR: string[] = []

export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
    })
}

export function sanitizeText(input: string): string {
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    })
}

export function sanitizeRichText(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ADD_ATTR: ['target'],
    })
}