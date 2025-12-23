import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Artist, ArtistRatingSummary } from '@core/index'

export const artistKeys = {
    all: ['artists'] as const,
    lists: () => [...artistKeys.all, 'list'] as const,
    list: (query?: string) => [...artistKeys.lists(), query] as const,
    details: () => [...artistKeys.all, 'detail'] as const,
    detail: (id: string) => [...artistKeys.details(), id] as const,
    ratings: (id: string) => [...artistKeys.all, 'ratings', id] as const,
}

// Get artists (from mock data)
export function useArtists(query?: string) {
    return useQuery({
        queryKey: artistKeys.list(query),
        queryFn: async () => {
            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            let artists = mockData.artists as { id: string; name: string }[]

            if (query) {
                artists = artists.filter(a =>
                    a.name.toLowerCase().includes(query.toLowerCase())
                )
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

// Get single artist
export function useArtist(artistId: string) {
    return useQuery({
        queryKey: artistKeys.detail(artistId),
        queryFn: async () => {
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

// Get artist rating summary
export function useArtistRatingSummary(artistId: string) {
    return useQuery({
        queryKey: artistKeys.ratings(artistId),
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_artist_rating_summary', { p_artist_id: artistId })

            if (error) throw error
            return data?.[0] as ArtistRatingSummary | null
        },
        enabled: !!artistId,
    })
}

// Get artist events
export function useArtistEvents(artistId: string) {
    return useQuery({
        queryKey: ['artist-events', artistId],
        queryFn: async () => {
            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            const events = mockData.events.filter(
                (e: { artistIds: string[] }) => e.artistIds.includes(artistId)
            )

            return events.map((e: { id: string; name: string; startAt: string; venueId: string; artistIds: string[]; ticketUrls: { label: string; url: string }[] }) => {
                const venue = mockData.venues.find((v: { id: string }) => v.id === e.venueId)
                return {
                    id: e.id,
                    provider: 'mock',
                    provider_event_id: e.id,
                    name: e.name,
                    start_at: e.startAt,
                    city: venue?.city || '',
                    country: venue?.country || '',
                    venue_id: e.venueId,
                    venue: venue ? { ...venue, created_at: new Date().toISOString() } : undefined,
                    ticket_urls: e.ticketUrls,
                    lineup: e.artistIds.map(id =>
                        mockData.artists.find((a: { id: string }) => a.id === id)?.name || ''
                    ),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }
            })
        },
        enabled: !!artistId,
    })
}
