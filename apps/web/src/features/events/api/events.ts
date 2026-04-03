import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { env, isSupabaseConfigured } from '@/shared/lib/env'
import { mockEventsProvider } from '../providers/mock-provider'
import { createTicketmasterBrowserProvider } from '../providers/ticketmaster-browser-provider'
import type { Event, EventFilters, PaginatedResponse, Provider, ProviderEvent, TicketUrl } from '@core/index'

// Query keys
export const eventKeys = {
    all: ['events'] as const,
    lists: () => [...eventKeys.all, 'list'] as const,
    list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
    details: () => [...eventKeys.all, 'detail'] as const,
    detail: (id: string) => [...eventKeys.details(), id] as const,
}

export type VenueRow = {
    id: string
    name: string
    city: string
    country: string
    lat: number | null
    lng: number | null
    provider_venue_id: string | null
    created_at: string
}

export type EventRow = {
    id: string
    provider: string
    provider_event_id: string
    name: string
    start_at: string
    city: string
    country: string
    venue_id: string | null
    ticket_urls: unknown
    lineup: unknown
    image_url: string | null
    created_at: string
    updated_at: string
    venue: VenueRow | null
}

function parseTicketUrls(raw: unknown): TicketUrl[] {
    if (!Array.isArray(raw)) return []
    return raw.filter(
        (x): x is TicketUrl =>
            typeof x === 'object' &&
            x !== null &&
            'url' in x &&
            typeof (x as TicketUrl).url === 'string'
    )
}

function parseLineup(raw: unknown): string[] {
    if (!Array.isArray(raw)) return []
    return raw.filter((x): x is string => typeof x === 'string')
}

export function mapEventRow(row: EventRow): Event {
    const venue = row.venue
    return {
        id: row.id,
        provider: row.provider as Provider,
        provider_event_id: row.provider_event_id,
        name: row.name,
        start_at: row.start_at,
        city: row.city,
        country: row.country,
        venue_id: row.venue_id,
        venue: venue
            ? {
                  id: venue.id,
                  name: venue.name,
                  city: venue.city,
                  country: venue.country,
                  lat: venue.lat,
                  lng: venue.lng,
                  provider_venue_id: venue.provider_venue_id,
                  created_at: venue.created_at,
              }
            : undefined,
        ticket_urls: parseTicketUrls(row.ticket_urls),
        lineup: parseLineup(row.lineup),
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

function mapProviderEventToEvent(e: ProviderEvent, provider: Provider): Event {
    return {
        id: e.id,
        provider,
        provider_event_id: e.id,
        name: e.name,
        start_at: e.startAt.toISOString(),
        city: e.venue.city,
        country: e.venue.country,
        venue_id: null,
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
    }
}

function applyProviderFilter<T extends { eq(column: string, value: string): T }>(
    query: T,
    mode: typeof env.EVENTS_PROVIDER
): T {
    if (mode === 'mock') return query.eq('provider', 'mock')
    if (mode === 'ticketmaster') return query.eq('provider', 'ticketmaster')
    return query
}

async function fetchEventsFromDatabase(
    filters: EventFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Event> | null> {
    if (!isSupabaseConfigured()) return null

    const page = filters.page || 1
    const pageSize = filters.pageSize || 12
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('events')
        .select('*, venue:venues(*)', { count: 'exact' })
        .order('start_at', { ascending: true })

    query = applyProviderFilter(query, env.EVENTS_PROVIDER)

    if (filters.city?.trim()) {
        query = query.ilike('city', filters.city.trim())
    }
    if (filters.from) {
        query = query.gte('start_at', filters.from)
    }
    if (filters.to) {
        query = query.lte('start_at', filters.to)
    }
    if (filters.venue_id) {
        query = query.eq('venue_id', filters.venue_id)
    }
    if (filters.artist_id) {
        const { data: links, error: linkErr } = await supabase
            .from('event_artists')
            .select('event_id')
            .eq('artist_id', filters.artist_id)
        if (linkErr) throw linkErr
        const ids = (links || []).map(l => l.event_id)
        if (ids.length === 0) {
            return { data: [], count: 0, page, pageSize, hasMore: false }
        }
        query = query.in('id', ids)
    }

    if (filters.query?.trim()) {
        query = query.ilike('name', `%${filters.query.trim()}%`)
    }

    const { data, error, count } = await query.range(from, to)

    if (error) throw error

    const rows = (data || []) as EventRow[]
    const total = count ?? rows.length
    return {
        data: rows.map(mapEventRow),
        count: total,
        page,
        pageSize,
        hasMore: to + 1 < total,
    }
}

async function fetchEventsFromMockProvider(
    filters: EventFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Event>> {
    const result = await mockEventsProvider.searchEvents({
        city: filters.city || '',
        country: filters.country,
        from: filters.from ? new Date(filters.from) : undefined,
        to: filters.to ? new Date(filters.to) : undefined,
        query: filters.query,
        page: filters.page || 1,
        pageSize: filters.pageSize || 12,
    })

    const events: Event[] = result.events.map(e => mapProviderEventToEvent(e, 'mock'))
    return {
        data: events,
        count: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
    }
}

async function fetchEventsFromTicketmasterLive(
    filters: EventFilters & { page?: number; pageSize?: number }
): Promise<PaginatedResponse<Event> | null> {
    const key = env.TICKETMASTER_API_KEY?.trim()
    if (!key) return null

    const live = createTicketmasterBrowserProvider(key)
    const result = await live.searchEvents({
        city: filters.city || '',
        country: filters.country,
        from: filters.from ? new Date(filters.from) : undefined,
        to: filters.to ? new Date(filters.to) : undefined,
        query: filters.query,
        page: filters.page || 1,
        pageSize: filters.pageSize || 12,
    })

    const events = result.events.map(e => mapProviderEventToEvent(e, 'ticketmaster'))
    return {
        data: events,
        count: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
    }
}

export function useEvents(filters: EventFilters & { page?: number; pageSize?: number }) {
    return useQuery({
        queryKey: [...eventKeys.list(filters), env.EVENTS_PROVIDER, isSupabaseConfigured()],
        queryFn: async () => {
            const db = await fetchEventsFromDatabase(filters)
            if (db && db.data.length > 0) return db

            if (env.EVENTS_PROVIDER === 'mock' || env.EVENTS_PROVIDER === 'all') {
                const mock = await fetchEventsFromMockProvider(filters)
                if (mock.data.length > 0) return mock
            }

            if (env.EVENTS_PROVIDER === 'ticketmaster' || env.EVENTS_PROVIDER === 'all') {
                const live = await fetchEventsFromTicketmasterLive(filters)
                if (live && live.data.length > 0) return live
            }

            if (db) return db

            return (
                (await fetchEventsFromMockProvider(filters)) || {
                    data: [],
                    count: 0,
                    page: filters.page || 1,
                    pageSize: filters.pageSize || 12,
                    hasMore: false,
                }
            )
        },
        staleTime: 1000 * 60 * 2,
    })
}

async function fetchSingleEventFromDb(eventId: string): Promise<Event | null> {
    if (!isSupabaseConfigured()) return null

    const { data, error } = await supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('id', eventId)
        .maybeSingle()

    if (error) throw error
    if (!data) return null
    return mapEventRow(data as EventRow)
}

export function useEvent(eventId: string) {
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), env.EVENTS_PROVIDER],
        queryFn: async () => {
            const fromDb = await fetchSingleEventFromDb(eventId)
            if (fromDb) return fromDb

            if (env.EVENTS_PROVIDER === 'ticketmaster' || env.EVENTS_PROVIDER === 'all') {
                const key = env.TICKETMASTER_API_KEY?.trim()
                if (key) {
                    const live = createTicketmasterBrowserProvider(key)
                    const pe = await live.getEvent(eventId)
                    if (pe) return mapProviderEventToEvent(pe, 'ticketmaster')
                }
            }

            const providerEvent = await mockEventsProvider.getEvent(eventId)
            if (!providerEvent) throw new Error('Event not found')
            return mapProviderEventToEvent(providerEvent, 'mock')
        },
        enabled: !!eventId,
    })
}

export function useCities() {
    return useQuery({
        queryKey: ['cities', isSupabaseConfigured(), env.EVENTS_PROVIDER],
        queryFn: async () => {
            if (isSupabaseConfigured()) {
                let q = supabase.from('venues').select('city').order('city')

                if (env.EVENTS_PROVIDER === 'mock') {
                    const { data: evs } = await supabase.from('events').select('venue_id').eq('provider', 'mock')
                    const ids = [...new Set((evs || []).map(e => e.venue_id).filter(Boolean))] as string[]
                    if (ids.length > 0) {
                        q = supabase.from('venues').select('city').in('id', ids).order('city')
                    }
                } else if (env.EVENTS_PROVIDER === 'ticketmaster') {
                    const { data: evs } = await supabase
                        .from('events')
                        .select('venue_id')
                        .eq('provider', 'ticketmaster')
                    const ids = [...new Set((evs || []).map(e => e.venue_id).filter(Boolean))] as string[]
                    if (ids.length > 0) {
                        q = supabase.from('venues').select('city').in('id', ids).order('city')
                    }
                }

                const { data, error } = await q
                if (!error && data?.length) {
                    const cities = [...new Set(data.map(r => r.city).filter(Boolean))] as string[]
                    return cities.sort((a, b) => a.localeCompare(b))
                }
            }
            return mockEventsProvider.getCities()
        },
        staleTime: 1000 * 60 * 30,
    })
}

// Attendance API
export function useAttendance(eventId: string) {
    return useQuery({
        queryKey: ['attendance', eventId],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle()

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

            const { data: existing } = await supabase
                .from('attendance')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (existing) {
                const { error } = await supabase
                    .from('attendance')
                    .update({ status })
                    .eq('id', existing.id)
                if (error) throw error
            } else {
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
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: (_data, eventId) => {
            queryClient.invalidateQueries({ queryKey: ['attendance', eventId] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}
