import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabase'
import { env } from '@/shared/lib/env'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { validateRpcResponse } from '@/shared/lib/utils'
import { artistRatingSummarySchema, artistLeaderboardEntrySchema } from '@/shared/validation/schemas'
import {
    artistKeys,
    resolveArtists,
    resolveArtist,
    resolveArtistEvents,
    type ArtistRatingQuery,
} from './resolver'

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
            if (!data || data.length === 0) return null
            return validateRpcResponse(artistRatingSummarySchema, data[0], 'get_artist_rating_summary')
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
            return validateRpcResponse(z.array(artistLeaderboardEntrySchema), data || [], 'get_artist_rating_summary leaderboard')
        },
    })
}

export const artistFollowKeys = {
    all: ['artist-follows'] as const,
    isFollowing: (artistId: string) => [...artistFollowKeys.all, 'is-following', artistId] as const,
    followedArtists: (userId: string) => [...artistFollowKeys.all, 'followed', userId] as const,
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
        queryKey: artistFollowKeys.followedArtists(user?.id ?? 'anonymous'),
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
