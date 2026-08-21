import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
    venueRatingSummarySchema,
    venueLeaderboardEntrySchema,
    artistRatingSummarySchema,
    artistLeaderboardEntrySchema,
    recommendedEventSchema,
    nearbyVenueSchema,
    trendingEventSchema,
    friendsAttendanceRowSchema,
    artistSongStatsSchema,
    artistSetlistStatsSchema,
    songStatsEntrySchema,
    yearStatsSchema,
} from '@/shared/validation/schemas'

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        'live-schema tests need SUPABASE_URL and SUPABASE_ANON_KEY. In CI these come from repo secrets; locally set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in apps/web/.env.local (picked up by vitest.live.config.ts).'
    )
}

const FIXTURES = {
    reviewId: 'f9f9fe86-354a-4f6b-8000-5b42b83d7708',
    venueId: 'b0000001-0000-4000-8000-000000000005',
    artistId: 'b0000002-0000-4000-8000-000000000007',
    eventId: 'b0000003-0000-4000-8000-000000000007',
    anyUserId: '00000000-0000-0000-0000-000000000001',
    anySongId: '00000000-0000-0000-0000-000000000002',
}

const HEADERS = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'content-type': 'application/json',
}

async function restGet(pathAndQuery: string) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, { headers: HEADERS })
    const body = await res.text()
    return { status: res.status, body, rows: res.ok ? (JSON.parse(body) as unknown[]) : [] }
}

async function callRpc(name: string, args: Record<string, unknown>) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(args),
    })
    const body = await res.text()
    return { status: res.status, body, rows: res.ok ? (JSON.parse(body) as unknown[]) : [] }
}

describe('live schema: profile embeds resolve (anon REST, one per query site)', () => {
    const embedSites: { site: string; path: string }[] = [
        {
            site: 'reviews.ts useEventReviews',
            path: `reviews?select=*,profile:profiles(id,display_name,avatar_url,username),photos:review_photos(*)&event_id=eq.${FIXTURES.eventId}&is_public=eq.true&status=eq.published&order=created_at.desc`,
        },
        {
            site: 'reviews.ts useReview',
            path: `reviews?select=*,profile:profiles(id,display_name,avatar_url,username,is_profile_public),event:events(*,venue:venues(*)),photos:review_photos(*)&id=eq.${FIXTURES.reviewId}`,
        },
        {
            site: 'comments.ts useComments',
            path: `comments?select=*,profile:profiles(id,display_name,username,avatar_url)&review_id=eq.${FIXTURES.reviewId}&order=created_at.asc`,
        },
        {
            site: 'comments.ts useCreateComment returning shape',
            path: `comments?select=*,profile:profiles(id,display_name,username,avatar_url)&limit=1`,
        },
        {
            site: 'setlists.ts useEventSetlists',
            path: `setlists?select=*,songs:setlist_songs(*,song:songs(*)),profile:profiles(id,display_name,username,avatar_url)&event_id=eq.${FIXTURES.eventId}&order=created_at.desc`,
        },
        {
            site: 'setlists.ts useSetlist',
            path: `setlists?select=*,songs:setlist_songs(*,song:songs(*)),profile:profiles(id,display_name,username,avatar_url),event:events(id,name,start_at)&limit=1`,
        },
        {
            site: 'lists.ts useList',
            path: `lists?select=*,profile:profiles(id,display_name,username,avatar_url),items:list_items(*,event:events(*,venue:venues(*)))&limit=1`,
        },
        {
            site: 'follows.ts useFollowers',
            path: `user_follows?select=follower:profiles!user_follows_follower_profile_fkey(*)&limit=1`,
        },
        {
            site: 'follows.ts useFollowing',
            path: `user_follows?select=following:profiles!user_follows_following_profile_fkey(*)&limit=1`,
        },
    ]

    it.each(embedSites)('$site', async ({ site, path }) => {
        const { status, body } = await restGet(path)
        expect(status, `${site} → HTTP ${status}: ${body}`).toBe(200)
    })

    it('the fixture review embeds a populated author profile', async () => {
        const { status, body, rows } = await restGet(
            `reviews?select=*,profile:profiles(display_name)&id=eq.${FIXTURES.reviewId}`
        )
        expect(status, `review embed → HTTP ${status}: ${body}`).toBe(200)
        expect(rows.length).toBe(1)
        expect((rows[0] as { profile: unknown }).profile).toBeTruthy()
    })
})

describe('live contract: every RPC the app calls parses with its Zod schema', () => {
    const rpcCases: {
        rpc: string
        args: Record<string, unknown>
        rowSchema: z.ZodTypeAny
        expectRows?: boolean
        maxRows?: number
    }[] = [
        {
            rpc: 'get_venue_rating_summary',
            args: { p_venue_id: FIXTURES.venueId, p_city: null, p_year: null },
            rowSchema: venueRatingSummarySchema,
            expectRows: true,
        },
        {
            rpc: 'get_venue_rating_summary (leaderboard)',
            args: { p_venue_id: null, p_city: null, p_year: null },
            rowSchema: venueLeaderboardEntrySchema,
            expectRows: true,
        },
        {
            rpc: 'get_artist_rating_summary',
            args: { p_artist_id: FIXTURES.artistId, p_city: null, p_year: null, p_venue_id: null },
            rowSchema: artistRatingSummarySchema,
            expectRows: true,
        },
        {
            rpc: 'get_artist_rating_summary (leaderboard)',
            args: { p_artist_id: null, p_city: null, p_year: null, p_venue_id: null },
            rowSchema: artistLeaderboardEntrySchema,
            expectRows: true,
        },
        {
            rpc: 'get_recommended_events',
            args: { p_user_id: FIXTURES.anyUserId, p_limit: 5 },
            rowSchema: recommendedEventSchema,
            maxRows: 5,
        },
        {
            rpc: 'get_trending_events',
            args: { p_limit: 5 },
            rowSchema: trendingEventSchema,
            maxRows: 5,
        },
        {
            rpc: 'get_nearby_venues',
            args: { p_lat: 51.5074, p_lng: -0.1278, p_radius_km: 50, p_limit: 5 },
            rowSchema: nearbyVenueSchema,
            maxRows: 5,
        },
        {
            rpc: 'get_friends_attendance',
            args: { p_user_id: FIXTURES.anyUserId, p_event_ids: [FIXTURES.eventId] },
            rowSchema: friendsAttendanceRowSchema,
        },
        {
            rpc: 'get_user_year_stats',
            args: { p_user_id: FIXTURES.anyUserId, p_year: 2026 },
            rowSchema: yearStatsSchema,
            expectRows: true,
        },
        {
            rpc: 'get_artist_song_stats',
            args: { p_artist_id: FIXTURES.artistId, p_limit: 5 },
            rowSchema: artistSongStatsSchema,
            maxRows: 5,
        },
        {
            rpc: 'get_artist_setlist_stats',
            args: { p_artist_id: FIXTURES.artistId },
            rowSchema: artistSetlistStatsSchema,
        },
        {
            rpc: 'get_song_stats',
            args: { p_song_id: FIXTURES.anySongId },
            rowSchema: songStatsEntrySchema,
        },
    ]

    it.each(rpcCases)('$rpc', async ({ rpc, args, rowSchema, expectRows, maxRows }) => {
        const name = rpc.replace(/ \(.*\)$/, '')
        const { status, body, rows } = await callRpc(name, args)
        expect(status, `${rpc} → HTTP ${status}: ${body}`).toBe(200)
        if (expectRows) {
            expect(rows.length, `${rpc} returned no rows for the fixture arguments`).toBeGreaterThan(0)
        }
        if (maxRows !== undefined) {
            expect(rows.length, `${rpc} ignored its limit argument`).toBeLessThanOrEqual(maxRows)
        }
        for (const row of rows) {
            const parsed = rowSchema.safeParse(row)
            expect(
                parsed.success,
                `${rpc} row does not match its Zod schema: ${JSON.stringify(parsed.success ? null : parsed.error.flatten())}\nrow: ${JSON.stringify(row)}`
            ).toBe(true)
        }
    })
})
