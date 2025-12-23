import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Venue, VenueRatingSummary } from '@core/index'
import { mockEventsProvider } from '@/features/events/providers/mock-provider'

export const venueKeys = {
    all: ['venues'] as const,
    lists: () => [...venueKeys.all, 'list'] as const,
    list: (city?: string) => [...venueKeys.lists(), city] as const,
    details: () => [...venueKeys.all, 'detail'] as const,
    detail: (id: string) => [...venueKeys.details(), id] as const,
    ratings: (id: string) => [...venueKeys.all, 'ratings', id] as const,
}

// Get venues (from mock data for now)
export function useVenues(city?: string) {
    return useQuery({
        queryKey: venueKeys.list(city),
        queryFn: async () => {
            // Get from mock provider
            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            let venues = mockData.venues as Venue[]

            if (city) {
                venues = venues.filter(v => v.city.toLowerCase() === city.toLowerCase())
            }

            return venues.map(v => ({
                ...v,
                created_at: new Date().toISOString(),
            }))
        },
    })
}

// Get single venue
export function useVenue(venueId: string) {
    return useQuery({
        queryKey: venueKeys.detail(venueId),
        queryFn: async () => {
            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            const venue = mockData.venues.find((v: { id: string }) => v.id === venueId)

            if (!venue) throw new Error('Venue not found')

            return {
                ...venue,
                created_at: new Date().toISOString(),
            } as Venue
        },
        enabled: !!venueId,
    })
}

// Get venue rating summary
export function useVenueRatingSummary(venueId: string) {
    return useQuery({
        queryKey: venueKeys.ratings(venueId),
        queryFn: async () => {
            const { data, error } = await supabase
                .rpc('get_venue_rating_summary', { p_venue_id: venueId })

            if (error) throw error
            return data?.[0] as VenueRatingSummary | null
        },
        enabled: !!venueId,
    })
}

// Get venue events
export function useVenueEvents(venueId: string) {
    return useQuery({
        queryKey: ['venue-events', venueId],
        queryFn: async () => {
            const mockData = await import('@/../../../packages/db/seed/mock-events.json')
            const events = mockData.events.filter(
                (e: { venueId: string }) => e.venueId === venueId
            )

            return events.map((e: { id: string; name: string; startAt: string; venueId: string; artistIds: string[]; ticketUrls: { label: string; url: string }[] }) => ({
                id: e.id,
                provider: 'mock',
                provider_event_id: e.id,
                name: e.name,
                start_at: e.startAt,
                city: mockData.venues.find((v: { id: string }) => v.id === e.venueId)?.city || '',
                country: mockData.venues.find((v: { id: string }) => v.id === e.venueId)?.country || '',
                venue_id: e.venueId,
                ticket_urls: e.ticketUrls,
                lineup: e.artistIds.map(id =>
                    mockData.artists.find((a: { id: string }) => a.id === id)?.name || ''
                ),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }))
        },
        enabled: !!venueId,
    })
}
