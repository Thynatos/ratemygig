import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabase'
import { env } from '@/shared/lib/env'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { validateRpcResponse } from '@/shared/lib/utils'
import { venueRatingSummarySchema, venueLeaderboardEntrySchema } from '@/shared/validation/schemas'
import type { VenueRatingSummary } from '@core/index'
import {
    venueKeys,
    resolveVenues,
    resolveVenue,
    resolveVenueEvents,
    type VenueRatingQuery,
} from './resolver'

export function useVenues(city?: string, page?: number, pageSize?: number) {
    return useQuery({
        queryKey: [...venueKeys.list(city), env.EVENTS_PROVIDER, page, pageSize],
        queryFn: () => resolveVenues(city, { page, pageSize }),
    })
}

export function useVenue(venueId: string) {
    return useQuery({
        queryKey: [...venueKeys.detail(venueId), env.EVENTS_PROVIDER],
        queryFn: () => resolveVenue(venueId),
        enabled: !!venueId,
    })
}

export function useVenueRatingSummary(venueId: string, filters?: VenueRatingQuery) {
    return useQuery({
        queryKey: venueKeys.ratings(venueId, filters),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_venue_rating_summary', {
                p_venue_id: venueId,
                p_city: filters?.city?.trim() || null,
                p_year: filters?.year ?? null,
            })

            if (error) throw error
            if (!data || data.length === 0) return null
            return validateRpcResponse(venueRatingSummarySchema, data[0], 'get_venue_rating_summary') as VenueRatingSummary
        },
        enabled: !!venueId,
    })
}

export function useVenueEvents(venueId: string) {
    return useQuery({
        queryKey: ['venue-events', venueId, env.EVENTS_PROVIDER],
        queryFn: () => resolveVenueEvents(venueId),
        enabled: !!venueId,
    })
}

export function useTopVenues(city?: string, year?: number) {
    return useQuery({
        queryKey: [...venueKeys.all, 'top', city, year],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_venue_rating_summary', {
                p_venue_id: null,
                p_city: city?.trim() || null,
                p_year: year ?? null,
            })
            if (error) throw error
            return validateRpcResponse(z.array(venueLeaderboardEntrySchema), data || [], 'get_venue_rating_summary leaderboard')
        },
    })
}

export const venueFollowKeys = {
    all: ['venue-follows'] as const,
    isFollowing: (venueId: string) => [...venueFollowKeys.all, 'is-following', venueId] as const,
    followedVenues: () => [...venueFollowKeys.all, 'followed'] as const,
}

export function useIsFollowingVenue(venueId: string) {
    const { user } = useAuth()
    return useQuery({
        queryKey: venueFollowKeys.isFollowing(venueId),
        queryFn: async () => {
            if (!user) return false

            const { data, error } = await supabase
                .from('venue_follows')
                .select('id')
                .eq('user_id', user.id)
                .eq('venue_id', venueId)
                .maybeSingle()

            if (error) throw error
            return !!data
        },
        enabled: !!venueId && !!user,
    })
}

export function useFollowedVenues() {
    const { user } = useAuth()
    return useQuery({
        queryKey: venueFollowKeys.followedVenues(),
        queryFn: async () => {
            if (!user) return []

            const { data, error } = await supabase
                .from('venue_follows')
                .select('*, venue:venues(*)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!user,
    })
}
