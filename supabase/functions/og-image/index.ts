import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { ImageResponse } from 'npm:@vercel/og@^0'
import { FALLBACK_PNG_B64, INTER_BOLD_B64, INTER_REGULAR_B64 } from './fonts.ts'

const WIDTH = 1200
const HEIGHT = 630
const BRAND = 'ratemygig'
const TAGLINE = 'Concert Rating Platform'
const FONT_NAME = 'Inter'

const COLORS = {
    background: '#020617',
    primary: '#38bdf8',
    accent: '#e879f9',
    gold: '#facc15',
    starEmpty: '#334155',
    text: '#f1f5f9',
    subtext: '#94a3b8',
}

const PNG_HEADERS = {
    'content-type': 'image/png',
    'cache-control': 'public, max-age=86400, s-maxage=86400',
    'x-content-type-options': 'nosniff',
}

interface SatoriNode {
    type: string
    props: {
        style?: Record<string, unknown>
        src?: string
        children?: SatoriNode[] | string
    }
}

interface FontOption {
    name: string
    data: Uint8Array
    weight: number
    style: 'normal'
}

interface ReviewRow {
    rating: number
    title: string | null
    status: string
    is_public: boolean
    user_id: string
    event: { name: string | null; start_at: string | null; city: string | null; venue: { name: string } | null } | null
    photos: { storage_path: string; thumbnail_path: string | null }[] | null
}

function b64ToBytes(value: string): Uint8Array {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

// Inter static instances, subset to latin + stars (see assets/ and DEPLOYMENT.md)
const SATORI_FONTS: FontOption[] = [
    { name: FONT_NAME, data: b64ToBytes(INTER_REGULAR_B64), weight: 400, style: 'normal' },
    { name: FONT_NAME, data: b64ToBytes(INTER_BOLD_B64), weight: 700, style: 'normal' },
]

function el(type: string, style: Record<string, unknown>, children?: SatoriNode[] | string): SatoriNode {
    const props: SatoriNode['props'] = { style }
    if (children !== undefined) props.children = children
    return { type, props }
}

function img(src: string, style: Record<string, unknown>): SatoriNode {
    return { type: 'img', props: { src, style } }
}

function cleanText(value: string | null | undefined, maxLength: number): string {
    if (!value) return ''
    const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
    if (cleaned.length <= maxLength) return cleaned
    return `${cleaned.slice(0, maxLength - 1)}…`
}

function clampRating(rating: number): number {
    return Math.min(5, Math.max(0, Math.round(rating)))
}

function starRow(rating: number, fontSize: number): SatoriNode {
    const filled = '★'.repeat(rating)
    const empty = '☆'.repeat(5 - rating)
    const children: SatoriNode[] = []
    if (filled) {
        children.push(el('div', { display: 'flex', color: COLORS.gold, letterSpacing: 6 }, filled))
    }
    if (empty) {
        children.push(el('div', { display: 'flex', color: COLORS.starEmpty, letterSpacing: 6 }, empty))
    }
    return el('div', { display: 'flex', fontSize }, children)
}

function brandChip(): SatoriNode {
    return el(
        'div',
        {
            display: 'flex',
            alignSelf: 'flex-start',
            border: `2px solid ${COLORS.primary}66`,
            borderRadius: 999,
            padding: '10px 24px',
            fontSize: 26,
            fontWeight: 700,
            color: COLORS.primary,
            marginBottom: 28,
        },
        BRAND
    )
}

function formatEventDate(startAt: string | null): string | null {
    if (!startAt) return null
    const date = new Date(startAt)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function buildFallbackCard(): SatoriNode {
    return el(
        'div',
        {
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `linear-gradient(135deg, ${COLORS.background} 0%, #0f172a 100%)`,
            fontFamily: FONT_NAME,
            color: COLORS.text,
        },
        el(
            'div',
            { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 },
            [
                starRow(5, 56),
                el(
                    'div',
                    { display: 'flex', fontSize: 118, fontWeight: 700 },
                    [
                        el('div', { display: 'flex', color: COLORS.primary }, 'rate'),
                        el('div', { display: 'flex', color: COLORS.accent }, 'mygig'),
                    ]
                ),
                el('div', {
                    display: 'flex',
                    width: 360,
                    height: 4,
                    borderRadius: 999,
                    backgroundImage: `linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.accent} 100%)`,
                }),
                el('div', { display: 'flex', fontSize: 40, color: COLORS.subtext }, TAGLINE),
            ]
        )
    )
}

function buildReviewCard(data: {
    eventName: string
    metaLine: string | null
    rating: number
    authorName: string
    photoUrl: string | null
}): SatoriNode {
    const leftChildren: SatoriNode[] = [brandChip()]

    leftChildren.push(
        el('div', { display: 'flex', fontSize: 60, fontWeight: 700, maxWidth: '100%', marginBottom: 14 }, data.eventName)
    )

    if (data.metaLine) {
        leftChildren.push(
            el('div', { display: 'flex', fontSize: 26, color: COLORS.subtext, marginBottom: 36 }, data.metaLine)
        )
    }

    leftChildren.push(
        el(
            'div',
            { display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 },
            [
                el('div', { display: 'flex', fontSize: 92, fontWeight: 700, color: COLORS.gold }, `${data.rating}/5`),
                starRow(data.rating, 40),
            ]
        )
    )

    leftChildren.push(
        el('div', { display: 'flex', fontSize: 26, color: COLORS.subtext }, `Review by ${data.authorName}`)
    )

    const children: SatoriNode[] = [
        el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, flexShrink: 1 }, leftChildren),
    ]

    if (data.photoUrl) {
        children.push(
            el(
                'div',
                { display: 'flex', position: 'relative', width: 460, height: 502 },
                [
                    img(data.photoUrl, {
                        width: 460,
                        height: 502,
                        objectFit: 'cover',
                        borderRadius: 24,
                    }),
                    el('div', {
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 460,
                        height: 502,
                        borderRadius: 24,
                        backgroundImage: 'linear-gradient(180deg, rgba(2,6,23,0) 60%, rgba(2,6,23,0.7) 100%)',
                    }),
                ]
            )
        )
    }

    return el(
        'div',
        {
            width: WIDTH,
            height: HEIGHT,
            display: 'flex',
            alignItems: 'center',
            gap: 48,
            padding: 64,
            backgroundImage: `linear-gradient(135deg, ${COLORS.background} 0%, #0f172a 100%)`,
            fontFamily: FONT_NAME,
            color: COLORS.text,
        },
        children
    )
}

async function renderPng(element: SatoriNode): Promise<Uint8Array> {
    const image = new ImageResponse(element, {
        width: WIDTH,
        height: HEIGHT,
        fonts: SATORI_FONTS,
        headers: {
            'cache-control': 'public, max-age=86400, s-maxage=86400',
            'x-content-type-options': 'nosniff',
        },
    })
    return new Uint8Array(await image.arrayBuffer())
}

function pngResponse(png: Uint8Array): Response {
    return new Response(png, { headers: PNG_HEADERS })
}

function errorPngResponse(): Response {
    return new Response(b64ToBytes(FALLBACK_PNG_B64), { status: 500, headers: PNG_HEADERS })
}

Deno.serve(async (req: Request) => {
    const reviewId = new URL(req.url).searchParams.get('reviewId')
    if (!reviewId) {
        return new Response('Missing reviewId parameter', { status: 400 })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') as string,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
        )

        const { data, error } = await supabase
            .from('reviews')
            .select(
                'rating, title, status, is_public, user_id, event:event_id(name, start_at, city, venue:venue_id(name)), photos:review_photos(storage_path, thumbnail_path)'
            )
            .eq('id', reviewId)
            .maybeSingle()

        if (error) throw new Error(`Review query failed: ${error.message}`)
        const review = data as ReviewRow | null

        // The service role client bypasses RLS, so public visibility must be
        // filtered manually here.
        const isPubliclyVisible = !!review && review.status === 'published' && review.is_public === true
        if (!isPubliclyVisible) {
            return pngResponse(await renderPng(buildFallbackCard()))
        }

        let authorName = 'Anonymous'
        if (review.user_id) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, username')
                .eq('id', review.user_id)
                .maybeSingle()
            authorName = profile?.display_name || profile?.username || 'Anonymous'
        }

        let photoUrl: string | null = null
        const firstPhoto = review.photos?.[0]
        if (firstPhoto) {
            const photoPath = firstPhoto.thumbnail_path || firstPhoto.storage_path
            const { data: signed } = await supabase.storage.from('review-photos').createSignedUrl(photoPath, 300)
            photoUrl = signed?.signedUrl ?? null
        }

        const rating = clampRating(review.rating)
        const eventName = cleanText(review.event?.name || review.title || 'Concert review', 64)
        const eventDate = formatEventDate(review.event?.start_at ?? null)
        const metaParts = [review.event?.venue?.name, review.event?.city, eventDate].filter(Boolean) as string[]
        const metaLine = metaParts.length > 0 ? metaParts.join(' · ') : null

        return pngResponse(
            await renderPng(
                buildReviewCard({
                    eventName,
                    metaLine,
                    rating,
                    authorName: cleanText(authorName, 40) || 'Anonymous',
                    photoUrl,
                })
            )
        )
    } catch (error) {
        console.error('og-image failed:', error)
        return errorPngResponse()
    }
})
