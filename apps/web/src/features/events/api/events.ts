import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { mockEventsProvider } from '../providers/mock-provider'
import type { Event, EventFilters, PaginatedResponse } from '@core/index'

// Query keys
export const eventKeys = {
    all: ['events'] as const,
    lists: () => [...eventKeys.all, 'list'] as const,
    list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
    details: () => [...eventKeys.all, 'detail'] as const,
    detail: (id: string) => [...eventKeys.details(), id] as const,
}

// Fetch events from provider and sync to database
export function useEvents(filters: EventFilters & { page?: number; pageSize?: number }) {
    return useQuery({
        queryKey: eventKeys.list(filters),
        queryFn: async () => {
            // For now, use mock provider directly
            // In production, this would fetch from Supabase after ingestion
            const result = await mockEventsProvider.searchEvents({
                city: filters.city || '',
                from: filters.from ? new Date(filters.from) : undefined,
                to: filters.to ? new Date(filters.to) : undefined,
                query: filters.query,
                page: filters.page || 1,
                pageSize: filters.pageSize || 12,
            })

            // Map to our Event type
            const events: Event[] = result.events.map(e => ({
                id: e.id,
                provider: 'mock',
                provider_event_id: e.id,
                name: e.name,
                start_at: e.startAt.toISOString(),
                city: e.venue.city,
                country: e.venue.country,
                venue_id: e.venue.id,
                venue: {
                    id: e.venue.id,
                    name: e.venue.name,
                    city: e.venue.city,
                    country: e.venue.country,
                    lat: e.venue.lat ?? null,
                    lng: e.venue.lng ?? null,
                    provider_venue_id: e.venue.id,
                    created_at: new Date().toISOString(),
                },
                ticket_urls: e.ticketUrls,
                lineup: e.artists.map(a => a.name),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }))

            return {
                data: events,
                count: result.totalCount,
                page: result.page,
                pageSize: result.pageSize,
                hasMore: result.hasMore,
            } as PaginatedResponse<Event>
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

// Fetch single event
export function useEvent(eventId: string) {
    return useQuery({
        queryKey: eventKeys.detail(eventId),
        queryFn: async () => {
            // Try to get from mock provider
            const providerEvent = await mockEventsProvider.getEvent(eventId)

            if (!providerEvent) {
                throw new Error('Event not found')
            }

            const event: Event = {
                id: providerEvent.id,
                provider: 'mock',
                provider_event_id: providerEvent.id,
                name: providerEvent.name,
                start_at: providerEvent.startAt.toISOString(),
                city: providerEvent.venue.city,
                country: providerEvent.venue.country,
                venue_id: providerEvent.venue.id,
                venue: {
                    id: providerEvent.venue.id,
                    name: providerEvent.venue.name,
                    city: providerEvent.venue.city,
                    country: providerEvent.venue.country,
                    lat: providerEvent.venue.lat ?? null,
                    lng: providerEvent.venue.lng ?? null,
                    provider_venue_id: providerEvent.venue.id,
                    created_at: new Date().toISOString(),
                },
                ticket_urls: providerEvent.ticketUrls,
                lineup: providerEvent.artists.map(a => a.name),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            return event
        },
        enabled: !!eventId,
    })
}

// Get available cities
export function useCities() {
    return useQuery({
        queryKey: ['cities'],
        queryFn: async () => {
            return mockEventsProvider.getCities()
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    })
}

// Attendance API
export function useAttendance(eventId: string) {
    return useQuery({
        queryKey: ['attendance', eventId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('event_id', eventId)
                .single()

            if (error && error.code !== 'PGRST116') throw error
            return data
        },
        enabled: !!eventId,
    })
}

export function useToggleAttendance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ eventId, status }: { eventId: string; status: 'planned' | 'attended' }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Check if attendance exists
            const { data: existing } = await supabase
                .from('attendance')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .single()

            if (existing) {
                // Update existing
                const { error } = await supabase
                    .from('attendance')
                    .update({ status })
                    .eq('id', existing.id)
                if (error) throw error
            } else {
                // Insert new
                const { error } = await supabase
                    .from('attendance')
                    .insert({ event_id: eventId, user_id: user.id, status })
                if (error) throw error
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance', variables.eventId] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}

export function useRemoveAttendance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (eventId: string) => {
            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('event_id', eventId)

            if (error) throw error
        },
        onSuccess: (_data, eventId) => {
            queryClient.invalidateQueries({ queryKey: ['attendance', eventId] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}
