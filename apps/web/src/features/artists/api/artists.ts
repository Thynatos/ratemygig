import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { env, isSupabaseConfigured } from '@/shared/lib/env'
import type { Artist, ArtistRatingSummary, Event } from '@core/index'
import { mapEventRow, type EventRow } from '../../events/api/events'

export const artistKeys = {
    all: ['artists'] as const,
    lists: () => [...artistKeys.all, 'list'] as const,
    list: (query?: string) => [...artistKeys.lists(), query] as const,
    details: () => [...artistKeys.all, 'detail'] as const,
    detail: (id: string) => [...artistKeys.details(), id] as const,
    ratings: (id: string, filters?: ArtistRatingQuery) => [...artistKeys.all, 'ratings', id, filters] as const,
}

export type ArtistRatingQuery = { city?: string; year?: number; venue_id?: string }

async function fetchArtistsFromDb(search?: string): Promise<Artist[] | null> {
    if (!isSupabaseConfigured()) return null

    let allowedArtistIds: string[] | null = null
    if (env.EVENTS_PROVIDER === 'mock' || env.EVENTS_PROVIDER === 'ticketmaster') {
        const { data: evs, error: evErr } = await supabase
            .from('events')
            .select('id')
            .eq('provider', env.EVENTS_PROVIDER)
        if (evErr) throw evErr
        const eventIds = (evs || []).map(e => e.id)
        if (eventIds.length === 0) return []

        const { data: links, error: linkErr } = await supabase
            .from('event_artists')
            .select('artist_id')
            .in('event_id', eventIds)
        if (linkErr) throw linkErr
        allowedArtistIds = [...new Set((links || []).map(l => l.artist_id))]
        if (allowedArtistIds.length === 0) return []
    }

    let q = supabase.from('artists').select('*').order('name', { ascending: true })
    if (allowedArtistIds) q = q.in('id', allowedArtistIds)
    if (search?.trim()) q = q.ilike('name', `%${search.trim()}%`)

    const { data, error } = await q
    if (error) throw error
    if (!data?.length) return []

    return data.map(
        row =>
            ({
                id: row.id,
                name: row.name,
                provider_artist_id: row.provider_artist_id,
                created_at: row.created_at,
            }) as Artist
    )
}

export function useArtists(query?: string) {
    return useQuery({
        queryKey: [...artistKeys.list(query), env.EVENTS_PROVIDER],
        queryFn: async () => {
            const fromDb = await fetchArtistsFromDb(query)
            if (fromDb && fromDb.length > 0) return fromDb

            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            let artists = mockData.artists as { id: string; name: string }[]
            if (query) {
                artists = artists.filter(a => a.name.toLowerCase().includes(query.toLowerCase()))
            }
            return artists.map(a => ({
                id: a.id,
                name: a.name,
                provider_artist_id: a.id,
                created_at: new Date().toISOString(),
            })) as Artist[]
        },
    })
}

export function useArtist(artistId: string) {
    return useQuery({
        queryKey: artistKeys.detail(artistId),
        queryFn: async () => {
            if (isSupabaseConfigured()) {
                const { data, error } = await supabase.from('artists').select('*').eq('id', artistId).maybeSingle()
                if (!error && data) {
                    return {
                        id: data.id,
                        name: data.name,
                        provider_artist_id: data.provider_artist_id,
                        created_at: data.created_at,
                    } as Artist
                }
            }

            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            const artist = mockData.artists.find((a: { id: string }) => a.id === artistId)
            if (!artist) throw new Error('Artist not found')
            return {
                id: artist.id,
                name: artist.name,
                provider_artist_id: artist.id,
                created_at: new Date().toISOString(),
            } as Artist
        },
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
        queryFn: async () => {
            if (isSupabaseConfigured()) {
                const { data: links, error: linkErr } = await supabase
                    .from('event_artists')
                    .select('event_id')
                    .eq('artist_id', artistId)

                if (linkErr) throw linkErr
                const eventIds = (links || []).map(l => l.event_id)
                if (eventIds.length === 0) return [] as Event[]

                let q = supabase
                    .from('events')
                    .select('*, venue:venues(*)')
                    .in('id', eventIds)
                    .order('start_at', { ascending: true })

                if (env.EVENTS_PROVIDER === 'mock') q = q.eq('provider', 'mock')
                else if (env.EVENTS_PROVIDER === 'ticketmaster') q = q.eq('provider', 'ticketmaster')

                const { data, error } = await q
                if (!error && data?.length) {
                    return (data as EventRow[]).map(mapEventRow) as Event[]
                }
            }

            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            const events = mockData.events.filter((e: { artistIds: string[] }) =>
                e.artistIds.includes(artistId)
            )

            return events.map(
                (e: {
                    id: string
                    name: string
                    startAt: string
                    venueId: string
                    artistIds: string[]
                    ticketUrls: { label: string; url: string }[]
                }) => {
                    const venue = mockData.venues.find((v: { id: string }) => v.id === e.venueId)
                    return {
                        id: e.id,
                        provider: 'mock' as const,
                        provider_event_id: e.id,
                        name: e.name,
                        start_at: e.startAt,
                        city: venue?.city || '',
                        country: venue?.country || '',
                        venue_id: e.venueId,
                        venue: venue
                            ? {
                                  id: venue.id,
                                  name: venue.name,
                                  city: venue.city,
                                  country: venue.country,
                                  lat: venue.lat ?? null,
                                  lng: venue.lng ?? null,
                                  provider_venue_id: null,
                                  created_at: new Date().toISOString(),
                              }
                            : undefined,
                        ticket_urls: e.ticketUrls,
                        lineup: e.artistIds.map(
                            id => mockData.artists.find((a: { id: string }) => a.id === id)?.name || ''
                        ),
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    }
                }
            ) as Event[]
        },
        enabled: !!artistId,
    })
}
