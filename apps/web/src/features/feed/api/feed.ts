import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'

export const feedKeys = {
    all: ['feed'] as const,
    timeline: (page: number) => [...feedKeys.all, 'timeline', page] as const,
}

export type FeedItemType = 'review' | 'event' | 'attendance'

export interface ReviewFeedItem {
    type: 'review'
    id: string
    created_at: string
    review: {
        id: string
        rating: number
        title: string | null
        body: string
        created_at: string
    }
    event: {
        id: string
        name: string
    } | null
    author: {
        id: string
        display_name: string | null
        username: string | null
        avatar_url: string | null
    } | null
}

export interface EventFeedItem {
    type: 'event'
    id: string
    created_at: string
    event: {
        id: string
        name: string
        start_at: string
    }
    venue: {
        id: string
        name: string
        city: string
    } | null
}

export interface AttendanceFeedItem {
    type: 'attendance'
    id: string
    created_at: string
    user: {
        id: string
        display_name: string | null
        username: string | null
        avatar_url: string | null
    } | null
    event: {
        id: string
        name: string
        start_at: string
    }
    venue: {
        id: string
        name: string
        city: string
    } | null
    status: 'planned' | 'attended'
}

export interface FeedResult {
    items: FeedItem[]
    hasMore: boolean
    hasErrors: boolean
}

export type FeedItem = ReviewFeedItem | EventFeedItem | AttendanceFeedItem

const PAGE_SIZE = 20

async function fetchFollowedIds(userId: string): Promise<{
    followedArtistIds: string[]
    followedVenueIds: string[]
    followedUserIds: string[]
}> {
    const [artistFollows, venueFollows, userFollows] = await Promise.all([
        supabase.from('artist_follows').select('artist_id').eq('user_id', userId),
        supabase.from('venue_follows').select('venue_id').eq('user_id', userId),
        supabase.from('user_follows').select('following_id').eq('follower_id', userId),
    ])

    return {
        followedArtistIds: (artistFollows.data || []).map((r: { artist_id: string }) => r.artist_id),
        followedVenueIds: (venueFollows.data || []).map((r: { venue_id: string }) => r.venue_id),
        followedUserIds: (userFollows.data || []).map((r: { following_id: string }) => r.following_id),
    }
}

async function fetchReviewFeed(
    followedUserIds: string[],
    since: string,
    offset: number,
    limit: number
): Promise<ReviewFeedItem[]> {
    if (followedUserIds.length === 0) return []

    try {
        const { data: reviews, error } = await supabase
            .from('reviews')
            .select('id, rating, title, body, created_at, user_id, event:events(id, name)')
            .in('user_id', followedUserIds)
            .eq('is_public', true)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error || !reviews) return []

        const authorIds = [...new Set(reviews.map((r: { user_id: string }) => r.user_id))]
        const { data: authors } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url')
            .in('id', authorIds)

        const authorMap = new Map((authors || []).map((a: { id: string }) => [a.id, a]))

        return reviews.map((review: { id: string; rating: number; title: string | null; body: string; created_at: string; user_id: string; event: unknown }) => {
            const event = Array.isArray(review.event) ? review.event[0] : review.event
            const ev = event as { id: string; name: string } | null
            return {
                type: 'review' as const,
                id: review.id,
                created_at: review.created_at,
                review: {
                    id: review.id,
                    rating: review.rating,
                    title: review.title,
                    body: review.body,
                    created_at: review.created_at,
                },
                event: ev ? { id: ev.id, name: ev.name } : null,
                author: authorMap.get(review.user_id) || null,
            }
        })
    } catch {
        return []
    }
}

async function fetchAttendanceFeed(
    followedUserIds: string[],
    since: string,
    offset: number,
    limit: number
): Promise<AttendanceFeedItem[]> {
    if (followedUserIds.length === 0) return []

    try {
        const { data: attendance, error } = await supabase
            .from('attendance')
            .select('id, status, created_at, user_id, event:events(id, name, start_at, venue:venues(id, name, city))')
            .in('user_id', followedUserIds)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (error || !attendance) return []

        const attUserIds = [...new Set(attendance.map((a: { user_id: string }) => a.user_id))]
        const { data: attUsers } = await supabase
            .from('profiles')
            .select('id, display_name, username, avatar_url')
            .in('id', attUserIds)

        const attUserMap = new Map((attUsers || []).map((u: { id: string }) => [u.id, u]))

        return attendance.map((att: { id: string; status: string; created_at: string; user_id: string; event: unknown }) => {
            const event = Array.isArray(att.event) ? att.event[0] : att.event
            const ev = event as { id: string; name: string; start_at: string; venue?: unknown } | null
            const venue = ev?.venue ? (Array.isArray(ev.venue) ? ev.venue[0] : ev.venue) as { id: string; name: string; city: string } | null : null
            return {
                type: 'attendance' as const,
                id: att.id,
                created_at: att.created_at,
                user: attUserMap.get(att.user_id) || null,
                event: ev ? { id: ev.id, name: ev.name, start_at: ev.start_at } : null,
                venue: venue ? { id: venue.id, name: venue.name, city: venue.city } : null,
                status: att.status as 'planned' | 'attended',
            }
        })
    } catch {
        return []
    }
}

async function fetchUpcomingArtistEvents(followedArtistIds: string[]): Promise<EventFeedItem[]> {
    if (followedArtistIds.length === 0) return []

    try {
        const { data: eventArtists, error } = await supabase
            .from('event_artists')
            .select('event_id')
            .in('artist_id', followedArtistIds)

        if (error || !eventArtists) return []

        const artistEventIds = [...new Set(eventArtists.map((ea: { event_id: string }) => ea.event_id))]
        if (artistEventIds.length === 0) return []

        const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, name, start_at, created_at, venue:venues(id, name, city)')
            .in('id', artistEventIds)
            .gte('start_at', new Date().toISOString())
            .order('start_at', { ascending: true })
            .limit(10)

        if (eventsError || !events) return []

        return events.map((ev: { id: string; name: string; start_at: string; created_at: string | null; venue: unknown }) => {
            const venue = ev.venue ? (Array.isArray(ev.venue) ? ev.venue[0] : ev.venue) as { id: string; name: string; city: string } | null : null
            return {
                type: 'event' as const,
                id: ev.id,
                created_at: ev.created_at || ev.start_at,
                event: { id: ev.id, name: ev.name, start_at: ev.start_at },
                venue: venue ? { id: venue.id, name: venue.name, city: venue.city } : null,
            }
        })
    } catch {
        return []
    }
}

async function fetchUpcomingVenueEvents(followedVenueIds: string[]): Promise<EventFeedItem[]> {
    if (followedVenueIds.length === 0) return []

    try {
        const { data: venueEvents, error } = await supabase
            .from('events')
            .select('id, name, start_at, created_at, venue:venues(id, name, city)')
            .in('venue_id', followedVenueIds)
            .gte('start_at', new Date().toISOString())
            .order('start_at', { ascending: true })
            .limit(10)

        if (error || !venueEvents) return []

        return venueEvents.map((ev: { id: string; name: string; start_at: string; created_at: string | null; venue: unknown }) => {
            const venue = ev.venue ? (Array.isArray(ev.venue) ? ev.venue[0] : ev.venue) as { id: string; name: string; city: string } | null : null
            return {
                type: 'event' as const,
                id: ev.id,
                created_at: ev.created_at || ev.start_at,
                event: { id: ev.id, name: ev.name, start_at: ev.start_at },
                venue: venue ? { id: venue.id, name: venue.name, city: venue.city } : null,
            }
        })
    } catch {
        return []
    }
}

export function useActivityFeed(page: number = 1) {
    return useQuery({
        queryKey: feedKeys.timeline(page),
        queryFn: async (): Promise<FeedResult> => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return { items: [], hasMore: false, hasErrors: false }

            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
            const { followedArtistIds, followedVenueIds, followedUserIds } = await fetchFollowedIds(user.id)

            const offset = (page - 1) * PAGE_SIZE
            let hasErrors = false

            const allResults = await Promise.allSettled([
                fetchReviewFeed(followedUserIds, thirtyDaysAgo, offset, PAGE_SIZE + 5),
                fetchAttendanceFeed(followedUserIds, thirtyDaysAgo, offset, PAGE_SIZE + 5),
                fetchUpcomingArtistEvents(followedArtistIds),
                fetchUpcomingVenueEvents(followedVenueIds),
            ])

            const items: FeedItem[] = []
            for (const result of allResults) {
                if (result.status === 'fulfilled') {
                    items.push(...result.value)
                } else {
                    hasErrors = true
                }
            }

            const seenIds = new Set<string>()
            const deduped = items.filter(item => {
                const key = `${item.type}-${item.id}`
                if (seenIds.has(key)) return false
                seenIds.add(key)
                return true
            })

            deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

            const paged = deduped.slice(0, PAGE_SIZE)
            const hasMore = deduped.length > PAGE_SIZE

            return { items: paged, hasMore, hasErrors }
        },
    })
}

export function usePrefetchNextFeedPage(page: number) {
    const queryClient = useQueryClient()
    return () => {
        queryClient.prefetchQuery({
            queryKey: feedKeys.timeline(page + 1),
        })
    }
}