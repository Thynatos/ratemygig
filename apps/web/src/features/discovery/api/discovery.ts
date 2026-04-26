import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabase'
import { isSupabaseConfigured } from '@/shared/lib/env'
import { validateRpcResponse } from '@/shared/lib/utils'
import { mapEventRow } from '@/features/events/api/events'
import type { EventRow } from '@/features/events/api/events'
import type { RecommendationReason } from '@core/index'
import { recommendedEventSchema, nearbyVenueSchema, trendingEventSchema } from '@/shared/validation/schemas'

export const discoveryKeys = {
    all: ['discovery'] as const,
    recommended: (userId: string) => [...discoveryKeys.all, 'recommended', userId] as const,
    nearbyVenues: (lat: number, lng: number, radius?: number) => [...discoveryKeys.all, 'nearby-venues', lat, lng, radius] as const,
    trending: (limit?: number) => [...discoveryKeys.all, 'trending', limit] as const,
}

export function useRecommendedEvents(limit: number = 12) {
    return useQuery({
        queryKey: discoveryKeys.recommended('current'),
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await supabase.rpc('get_recommended_events', {
                p_user_id: user.id,
                p_limit: limit,
            })

            if (error) throw error

            const recommendations = validateRpcResponse(
                z.array(recommendedEventSchema),
                data || [],
                'get_recommended_events'
            ) as { event_id: string; reason: RecommendationReason; priority: number }[]

            if (recommendations.length === 0) return []

            const eventIds = recommendations.map(r => r.event_id)
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('*, venue:venues(*)')
                .in('id', eventIds)

            if (eventsError) throw eventsError

            const eventMap = new Map(
                (events as EventRow[]).map(row => [row.id, mapEventRow(row)])
            )

            const reasonMap = new Map(recommendations.map(r => [r.event_id, r.reason]))

            return eventIds
                .filter(id => eventMap.has(id))
                .map(id => ({
                    event: eventMap.get(id)!,
                    reason: reasonMap.get(id)!,
                }))
        },
        enabled: isSupabaseConfigured(),
    })
}

export function useNearbyVenues(lat: number | null, lng: number | null, radiusKm: number = 50, limit: number = 20) {
    return useQuery({
        queryKey: discoveryKeys.nearbyVenues(lat ?? 0, lng ?? 0, radiusKm),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_nearby_venues', {
                p_lat: lat,
                p_lng: lng,
                p_radius_km: radiusKm,
                p_limit: limit,
            })

            if (error) throw error

            const venues = validateRpcResponse(z.array(nearbyVenueSchema), data || [], 'get_nearby_venues')
            return venues.map(v => ({
                ...v,
                provider_venue_id: null,
                created_at: new Date().toISOString(),
            }))
        },
        enabled: lat !== null && lng !== null && isSupabaseConfigured(),
    })
}

export function useTrendingEvents(limit: number = 10) {
    return useQuery({
        queryKey: discoveryKeys.trending(limit),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_trending_events', {
                p_limit: limit,
            })

            if (error) throw error

            const trending = validateRpcResponse(
                z.array(trendingEventSchema),
                data || [],
                'get_trending_events'
            ) as { event_id: string; attendance_count: number; review_count: number; trending_score: number }[]

            if (trending.length === 0) return []

            const eventIds = trending.map(t => t.event_id)
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('*, venue:venues(*)')
                .in('id', eventIds)

            if (eventsError) throw eventsError

            const eventMap = new Map(
                (events as EventRow[]).map(row => [row.id, mapEventRow(row)])
            )

            const scoreMap = new Map(trending.map(t => [t.event_id, { attendance_count: t.attendance_count, review_count: t.review_count, trending_score: Number(t.trending_score) }]))

            return eventIds
                .filter(id => eventMap.has(id))
                .map(id => ({
                    event: eventMap.get(id)!,
                    ...scoreMap.get(id)!,
                }))
        },
        enabled: isSupabaseConfigured(),
    })
}