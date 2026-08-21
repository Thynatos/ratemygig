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

const OG_DESCRIPTION_MAX_LENGTH = 200
const OG_TITLE_FALLBACK = 'ratemygig Review'

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
