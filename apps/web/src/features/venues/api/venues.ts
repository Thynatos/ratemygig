import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { env, isSupabaseConfigured } from '@/shared/lib/env'
import type { Venue, VenueRatingSummary, Event } from '@core/index'
import { mapEventRow, type EventRow } from '../../events/api/events'

export const venueKeys = {
    all: ['venues'] as const,
    lists: () => [...venueKeys.all, 'list'] as const,
    list: (city?: string) => [...venueKeys.lists(), city] as const,
    details: () => [...venueKeys.all, 'detail'] as const,
    detail: (id: string) => [...venueKeys.details(), id] as const,
    ratings: (id: string, filters?: VenueRatingQuery) => [...venueKeys.all, 'ratings', id, filters] as const,
}

export type VenueRatingQuery = { city?: string; year?: number }

async function fetchVenuesFromDb(city?: string): Promise<Venue[] | null> {
    if (!isSupabaseConfigured()) return null

    let q = supabase.from('venues').select('*').order('name', { ascending: true })

    if (env.EVENTS_PROVIDER === 'mock') {
        const { data: evs } = await supabase.from('events').select('venue_id').eq('provider', 'mock')
        const ids = [...new Set((evs || []).map(e => e.venue_id).filter(Boolean))] as string[]
        if (ids.length) q = q.in('id', ids)
    } else if (env.EVENTS_PROVIDER === 'ticketmaster') {
        const { data: evs } = await supabase.from('events').select('venue_id').eq('provider', 'ticketmaster')
        const ids = [...new Set((evs || []).map(e => e.venue_id).filter(Boolean))] as string[]
        if (ids.length) q = q.in('id', ids)
    }

    if (city?.trim()) {
        q = q.ilike('city', city.trim())
    }

    const { data, error } = await q
    if (error) throw error
    if (!data?.length) return []

    return data.map(
        row =>
            ({
                id: row.id,
                name: row.name,
                city: row.city,
                country: row.country,
                lat: row.lat,
                lng: row.lng,
                provider_venue_id: row.provider_venue_id,
                created_at: row.created_at,
            }) as Venue
    )
}

export function useVenues(city?: string) {
    return useQuery({
        queryKey: [...venueKeys.list(city), env.EVENTS_PROVIDER],
        queryFn: async () => {
            const fromDb = await fetchVenuesFromDb(city)
            if (fromDb && fromDb.length > 0) return fromDb

            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            let venues = mockData.venues as Venue[]
            if (city) {
                venues = venues.filter(v => v.city.toLowerCase() === city.toLowerCase())
            }
            return venues.map(v => ({
                ...v,
                provider_venue_id: v.provider_venue_id ?? null,
                lat: v.lat ?? null,
                lng: v.lng ?? null,
                created_at: new Date().toISOString(),
            })) as Venue[]
        },
    })
}

export function useVenue(venueId: string) {
    return useQuery({
        queryKey: venueKeys.detail(venueId),
        queryFn: async () => {
            if (isSupabaseConfigured()) {
                const { data, error } = await supabase.from('venues').select('*').eq('id', venueId).maybeSingle()
                if (!error && data) {
                    return {
                        id: data.id,
                        name: data.name,
                        city: data.city,
                        country: data.country,
                        lat: data.lat,
                        lng: data.lng,
                        provider_venue_id: data.provider_venue_id,
                        created_at: data.created_at,
                    } as Venue
                }
            }

            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            const venue = mockData.venues.find((v: { id: string }) => v.id === venueId)
            if (!venue) throw new Error('Venue not found')
            return {
                ...venue,
                provider_venue_id: null,
                lat: venue.lat ?? null,
                lng: venue.lng ?? null,
                created_at: new Date().toISOString(),
            } as Venue
        },
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
            return data?.[0] as VenueRatingSummary | null
        },
        enabled: !!venueId,
    })
}

export function useVenueEvents(venueId: string) {
    return useQuery({
        queryKey: ['venue-events', venueId, env.EVENTS_PROVIDER],
        queryFn: async () => {
            if (isSupabaseConfigured()) {
                let q = supabase
                    .from('events')
                    .select('*, venue:venues(*)')
                    .eq('venue_id', venueId)
                    .order('start_at', { ascending: true })

                if (env.EVENTS_PROVIDER === 'mock') q = q.eq('provider', 'mock')
                else if (env.EVENTS_PROVIDER === 'ticketmaster') q = q.eq('provider', 'ticketmaster')

                const { data, error } = await q
                if (!error && data?.length) {
                    return (data as EventRow[]).map(mapEventRow) as Event[]
                }
            }

            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            const events = mockData.events.filter(
                (e: { venueId: string }) => e.venueId === venueId
            )

            return events.map(
                (e: {
                    id: string
                    name: string
                    startAt: string
                    venueId: string
                    artistIds: string[]
                    ticketUrls: { label: string; url: string }[]
                }) => ({
                    id: e.id,
                    provider: 'mock' as const,
                    provider_event_id: e.id,
                    name: e.name,
                    start_at: e.startAt,
                    city: mockData.venues.find((v: { id: string }) => v.id === e.venueId)?.city || '',
                    country: mockData.venues.find((v: { id: string }) => v.id === e.venueId)?.country || '',
                    venue_id: e.venueId,
                    ticket_urls: e.ticketUrls,
                    lineup: e.artistIds.map(
                        id => mockData.artists.find((a: { id: string }) => a.id === id)?.name || ''
                    ),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
            ) as Event[]
        },
        enabled: !!venueId,
    })
}
