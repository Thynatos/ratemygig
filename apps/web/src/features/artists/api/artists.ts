import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { env, isSupabaseConfigured, type EventsProviderMode } from '@/shared/lib/env'
import { allowsMockFallback, getDatabaseProviderFilter } from '@/shared/lib/provider-policy'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { Artist, ArtistRatingSummary, Event } from '@core/index'
import { mapEventRow, type EventRow } from '../../events/api/events'
import { getMockArtist, getMockArtists, getMockEventsByArtistId } from '../../events/providers/mock-catalog'

export const artistKeys = {
    all: ['artists'] as const,
    lists: () => [...artistKeys.all, 'list'] as const,
    list: (query?: string) => [...artistKeys.lists(), query] as const,
    details: () => [...artistKeys.all, 'detail'] as const,
    detail: (id: string) => [...artistKeys.details(), id] as const,
    ratings: (id: string, filters?: ArtistRatingQuery) => [...artistKeys.all, 'ratings', id, filters] as const,
}

export type ArtistRatingQuery = { city?: string; year?: number; venue_id?: string }

async function fetchArtistsFromDb(
    search?: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER,
    page?: number,
    pageSize?: number,
): Promise<{ data: Artist[]; hasMore: boolean } | null> {
    if (!isSupabaseConfigured()) return null

    const provider = getDatabaseProviderFilter(mode)
    let allowedArtistIds: string[] | null = null
    if (provider) {
        const { data: evs, error: evErr } = await supabase
            .from('events')
            .select('id')
            .eq('provider', provider)
        if (evErr) throw evErr
        const eventIds = (evs || []).map(e => e.id)
        if (eventIds.length === 0) return { data: [], hasMore: false }

        const { data: links, error: linkErr } = await supabase
            .from('event_artists')
            .select('artist_id')
            .in('event_id', eventIds)
        if (linkErr) throw linkErr
        allowedArtistIds = [...new Set((links || []).map(l => l.artist_id))]
        if (allowedArtistIds.length === 0) return { data: [], hasMore: false }
    }

    let q = supabase.from('artists').select('*', { count: 'exact' }).order('name', { ascending: true })
    if (allowedArtistIds) q = q.in('id', allowedArtistIds)
    if (search?.trim()) q = q.ilike('name', `%${search.trim()}%`)

    const limit = pageSize ?? 24
    const offset = ((page ?? 1) - 1) * limit
    const { data, error, count } = await q.range(offset, offset + limit - 1)
    if (error) throw error
    if (!data) return { data: [], hasMore: false }

    const artists = data.map(
        row =>
            ({
                id: row.id,
                name: row.name,
                provider_artist_id: row.provider_artist_id,
                created_at: row.created_at,
            }) as Artist
    )

    return { data: artists, hasMore: (count ?? 0) > offset + limit }
}

async function fetchArtistFromMock(artistId: string): Promise<Artist | null> {
    return getMockArtist(artistId)
}

async function fetchArtistsFromMock(search?: string): Promise<Artist[]> {
    return getMockArtists(search)
}

async function fetchArtistEventsFromMock(artistId: string): Promise<Event[]> {
    return getMockEventsByArtistId(artistId)
}

export interface ResolveArtistsDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (search?: string, page?: number, pageSize?: number) => Promise<{ data: Artist[]; hasMore: boolean } | null>
    fetchFromMock: (search?: string) => Promise<Artist[]>
}

export async function resolveArtistsWithDeps(search: string | undefined, deps: ResolveArtistsDeps, page?: number, pageSize?: number): Promise<{ data: Artist[]; hasMore: boolean }> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase(search, page, pageSize)
        if (fromDb && fromDb.data.length > 0) return fromDb
        if (fromDb && !allowsMockFallback(deps.mode)) return fromDb
    }

    if (allowsMockFallback(deps.mode)) {
        const mockData = await deps.fetchFromMock(search)
        return { data: mockData, hasMore: false }
    }

    return { data: [], hasMore: false }
}

export async function resolveArtists(
    search?: string,
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean; page?: number; pageSize?: number }
): Promise<{ data: Artist[]; hasMore: boolean }> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveArtistsWithDeps(search, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: (nextSearch, nextPage, nextPageSize) => fetchArtistsFromDb(nextSearch, mode, nextPage, nextPageSize),
        fetchFromMock: fetchArtistsFromMock,
    }, options?.page, options?.pageSize)
}

export interface ResolveArtistDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (artistId: string) => Promise<Artist | null>
    fetchFromMock: (artistId: string) => Promise<Artist | null>
}

export async function resolveArtistWithDeps(artistId: string, deps: ResolveArtistDeps): Promise<Artist> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase(artistId)
        if (fromDb) return fromDb
    }

    if (allowsMockFallback(deps.mode)) {
        const fromMock = await deps.fetchFromMock(artistId)
        if (fromMock) return fromMock
    }

    throw new Error('Artist not found')
}

async function fetchArtistFromDb(
    artistId: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<Artist | null> {
    if (!isSupabaseConfigured()) return null

    const provider = getDatabaseProviderFilter(mode)
    if (provider) {
        const { data: links, error: linkErr } = await supabase
            .from('event_artists')
            .select('event_id')
            .eq('artist_id', artistId)

        if (linkErr) throw linkErr

        const eventIds = (links || []).map(link => link.event_id)
        if (eventIds.length === 0) return null

        const { data: scopedEvents, error: eventsError } = await supabase
            .from('events')
            .select('id')
            .eq('provider', provider)
            .in('id', eventIds)
            .limit(1)

        if (eventsError) throw eventsError
        if (!scopedEvents?.length) return null
    }

    const { data, error } = await supabase.from('artists').select('*').eq('id', artistId).maybeSingle()
    if (error) throw error
    if (!data) return null

    return {
        id: data.id,
        name: data.name,
        provider_artist_id: data.provider_artist_id,
        created_at: data.created_at,
    } as Artist
}

export async function resolveArtist(
    artistId: string,
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean }
): Promise<Artist> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveArtistWithDeps(artistId, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: id => fetchArtistFromDb(id, mode),
        fetchFromMock: fetchArtistFromMock,
    })
}

export interface ResolveArtistEventsDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (artistId: string) => Promise<Event[] | null>
    fetchFromMock: (artistId: string) => Promise<Event[]>
}

export async function resolveArtistEventsWithDeps(artistId: string, deps: ResolveArtistEventsDeps): Promise<Event[]> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase(artistId)
        if (fromDb && fromDb.length > 0) return fromDb
        if (fromDb && !allowsMockFallback(deps.mode)) return fromDb
    }

    if (allowsMockFallback(deps.mode)) {
        return deps.fetchFromMock(artistId)
    }

    return []
}

async function fetchArtistEventsFromDb(
    artistId: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<Event[] | null> {
    if (!isSupabaseConfigured()) return null

    const { data: links, error: linkErr } = await supabase
        .from('event_artists')
        .select('event_id')
        .eq('artist_id', artistId)

    if (linkErr) throw linkErr
    const eventIds = (links || []).map(link => link.event_id)
    if (eventIds.length === 0) return []

    let query = supabase
        .from('events')
        .select('*, venue:venues(*)')
        .in('id', eventIds)
        .order('start_at', { ascending: true })

    const provider = getDatabaseProviderFilter(mode)
    if (provider) query = query.eq('provider', provider)

    const { data, error } = await query
    if (error) throw error
    if (!data?.length) return []

    return (data as EventRow[]).map(mapEventRow) as Event[]
}

export async function resolveArtistEvents(
    artistId: string,
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean }
): Promise<Event[]> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveArtistEventsWithDeps(artistId, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: id => fetchArtistEventsFromDb(id, mode),
        fetchFromMock: fetchArtistEventsFromMock,
    })
}

export function useArtists(query?: string, page?: number, pageSize?: number) {
    return useQuery({
        queryKey: [...artistKeys.list(query), env.EVENTS_PROVIDER, page, pageSize],
        queryFn: () => resolveArtists(query, { page, pageSize }),
    })
}

export function useArtist(artistId: string) {
    return useQuery({
        queryKey: [...artistKeys.detail(artistId), env.EVENTS_PROVIDER],
        queryFn: () => resolveArtist(artistId),
        enabled: !!artistId,
    })
}

export function useArtistRatingSummary(artistId: string, filters?: ArtistRatingQuery) {
    return useQuery({
        queryKey: artistKeys.ratings(artistId, filters),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_artist_rating_summary', {
                p_artist_id: artistId,
                p_city: filters?.city?.trim() || null,
                p_year: filters?.year ?? null,
                p_venue_id: filters?.venue_id || null,
            })

            if (error) throw error
            return data?.[0] as ArtistRatingSummary | null
        },
        enabled: !!artistId,
    })
}

export function useArtistEvents(artistId: string) {
    return useQuery({
        queryKey: ['artist-events', artistId, env.EVENTS_PROVIDER],
        queryFn: () => resolveArtistEvents(artistId),
        enabled: !!artistId,
    })
}

type ArtistLeaderboardEntry = {
    artist_id: string
    artist_name: string
    avg_rating: number
    count_reviews: number
}

export function useTopArtists(city?: string, year?: number) {
    return useQuery({
        queryKey: [...artistKeys.all, 'top', city, year],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_artist_rating_summary', {
                p_artist_id: null,
                p_city: city?.trim() || null,
                p_year: year ?? null,
                p_venue_id: null,
            })
            if (error) throw error
            return (data || []) as ArtistLeaderboardEntry[]
        },
    })
}

// ============================================
// Artist Follow Hooks
// ============================================

export const artistFollowKeys = {
    all: ['artist-follows'] as const,
    isFollowing: (artistId: string) => [...artistFollowKeys.all, 'is-following', artistId] as const,
    followedArtists: () => [...artistFollowKeys.all, 'followed'] as const,
}

export function useIsFollowingArtist(artistId: string) {
    const { user } = useAuth()
    return useQuery({
        queryKey: artistFollowKeys.isFollowing(artistId),
        queryFn: async () => {
            if (!user) return false

            const { data, error } = await supabase
                .from('artist_follows')
                .select('id')
                .eq('user_id', user.id)
                .eq('artist_id', artistId)
                .maybeSingle()

            if (error) throw error
            return !!data
        },
        enabled: !!artistId && !!user,
    })
}

export function useFollowedArtists() {
    const { user } = useAuth()
    return useQuery({
        queryKey: artistFollowKeys.followedArtists(),
        queryFn: async () => {
            if (!user) return []

            const { data, error } = await supabase
                .from('artist_follows')
                .select('*, artist:artists(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!user,
    })
}

export function useFollowArtist(artistId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('artist_follows')
                .insert({ user_id: user.id, artist_id: artistId })

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: artistFollowKeys.isFollowing(artistId) })
            const prev = queryClient.getQueryData(artistFollowKeys.isFollowing(artistId))
            queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), true)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: artistFollowKeys.all })
        },
    })
}

export function useUnfollowArtist(artistId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('artist_follows')
                .delete()
                .eq('user_id', user.id)
                .eq('artist_id', artistId)

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: artistFollowKeys.isFollowing(artistId) })
            const prev = queryClient.getQueryData(artistFollowKeys.isFollowing(artistId))
            queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), false)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: artistFollowKeys.all })
        },
    })
}
