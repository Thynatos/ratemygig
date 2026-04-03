import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { env, isSupabaseConfigured, type EventsProviderMode } from '@/shared/lib/env'
import { allowsMockFallback, allowsTicketmasterLive, getDatabaseProviderFilter } from '@/shared/lib/provider-policy'
import { mockEventsProvider } from '../providers/mock-provider'
import type { Event, EventFilters, IEventsProvider, PaginatedResponse, Provider, ProviderEvent, TicketUrl } from '@core/index'

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
    const timestamp = new Date().toISOString()

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
            created_at: timestamp,
        },
        ticket_urls: e.ticketUrls,
        lineup: e.artists.map(a => a.name),
        created_at: timestamp,
        updated_at: timestamp,
    }
}

function applyProviderFilter<T extends { eq(column: string, value: string): T }>(query: T, mode: EventsProviderMode): T {
    const provider = getDatabaseProviderFilter(mode)
    if (provider) return query.eq('provider', provider)
    return query
}

function createEmptyPaginatedResponse<T>(page: number, pageSize: number): PaginatedResponse<T> {
    return {
        data: [],
        count: 0,
        page,
        pageSize,
        hasMore: false,
    }
}

function getPagination(filters: EventFilters & { page?: number; pageSize?: number }) {
    return {
        page: filters.page || 1,
        pageSize: filters.pageSize || 12,
    }
}

async function getTicketmasterLiveProvider(mode: EventsProviderMode): Promise<IEventsProvider | null> {
    if (!allowsTicketmasterLive(mode)) return null

    const key = env.TICKETMASTER_API_KEY?.trim()
    if (!key) return null

    const { createTicketmasterBrowserProvider } = await import('../providers/ticketmaster-browser-provider')
    return createTicketmasterBrowserProvider(key)
}

async function fetchEventsFromDatabase(
    filters: EventFilters & { page?: number; pageSize?: number },
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<PaginatedResponse<Event> | null> {
    if (!isSupabaseConfigured()) return null

    const { page, pageSize } = getPagination(filters)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
        .from('events')
        .select('*, venue:venues(*)', { count: 'exact' })
        .order('start_at', { ascending: true })

    query = applyProviderFilter(query, mode)

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
    filters: EventFilters & { page?: number; pageSize?: number },
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<PaginatedResponse<Event> | null> {
    const live = await getTicketmasterLiveProvider(mode)
    if (!live) return null

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

async function fetchSingleEventFromDb(
    eventId: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<Event | null> {
    if (!isSupabaseConfigured()) return null

    const provider = getDatabaseProviderFilter(mode)

    let query = supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('id', eventId)

    if (provider) query = query.eq('provider', provider)

    const { data, error } = await query.maybeSingle()

    if (error) throw error
    if (!data) return null
    return mapEventRow(data as EventRow)
}

async function fetchEventFromMockProvider(eventId: string): Promise<Event | null> {
    const providerEvent = await mockEventsProvider.getEvent(eventId)
    if (!providerEvent) return null
    return mapProviderEventToEvent(providerEvent, 'mock')
}

async function fetchEventFromTicketmasterLive(
    eventId: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<Event | null> {
    const live = await getTicketmasterLiveProvider(mode)
    if (!live) return null

    const providerEvent = await live.getEvent(eventId)
    if (!providerEvent) return null
    return mapProviderEventToEvent(providerEvent, 'ticketmaster')
}

async function fetchCitiesFromDatabase(mode: EventsProviderMode = env.EVENTS_PROVIDER): Promise<string[] | null> {
    if (!isSupabaseConfigured()) return null

    const provider = getDatabaseProviderFilter(mode)
    if (!provider) {
        const { data, error } = await supabase.from('venues').select('city').order('city')
        if (error) throw error

        return [...new Set((data || []).map(row => row.city).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    }

    const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('venue_id')
        .eq('provider', provider)

    if (eventsError) throw eventsError

    const venueIds = [...new Set((events || []).map(event => event.venue_id).filter(Boolean))] as string[]
    if (venueIds.length === 0) return []

    const { data, error } = await supabase.from('venues').select('city').in('id', venueIds).order('city')
    if (error) throw error

    return [...new Set((data || []).map(row => row.city).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

interface ResolveEventsDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (filters: EventFilters & { page?: number; pageSize?: number }) => Promise<PaginatedResponse<Event> | null>
    fetchFromMock: (filters: EventFilters & { page?: number; pageSize?: number }) => Promise<PaginatedResponse<Event>>
    fetchFromTicketmasterLive: (
        filters: EventFilters & { page?: number; pageSize?: number }
    ) => Promise<PaginatedResponse<Event> | null>
}

export async function resolveEventsWithDeps(
    filters: EventFilters & { page?: number; pageSize?: number },
    deps: ResolveEventsDeps
): Promise<PaginatedResponse<Event>> {
    const { page, pageSize } = getPagination(filters)
    let fallback = createEmptyPaginatedResponse<Event>(page, pageSize)

    if (deps.supabaseConfigured) {
        const db = await deps.fetchFromDatabase(filters)
        if (db) {
            fallback = db
            if (db.data.length > 0) return db
        }
    }

    if (allowsTicketmasterLive(deps.mode)) {
        const live = await deps.fetchFromTicketmasterLive(filters)
        if (live) {
            fallback = live
            if (live.data.length > 0) return live
        }
    }

    if (allowsMockFallback(deps.mode)) {
        return deps.fetchFromMock(filters)
    }

    return fallback
}

export async function resolveEvents(
    filters: EventFilters & { page?: number; pageSize?: number },
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean }
): Promise<PaginatedResponse<Event>> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveEventsWithDeps(filters, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: nextFilters => fetchEventsFromDatabase(nextFilters, mode),
        fetchFromMock: fetchEventsFromMockProvider,
        fetchFromTicketmasterLive: nextFilters => fetchEventsFromTicketmasterLive(nextFilters, mode),
    })
}

interface ResolveEventDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (eventId: string) => Promise<Event | null>
    fetchFromMock: (eventId: string) => Promise<Event | null>
    fetchFromTicketmasterLive: (eventId: string) => Promise<Event | null>
}

export async function resolveEventWithDeps(eventId: string, deps: ResolveEventDeps): Promise<Event> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase(eventId)
        if (fromDb) return fromDb
    }

    if (allowsTicketmasterLive(deps.mode)) {
        const live = await deps.fetchFromTicketmasterLive(eventId)
        if (live) return live
    }

    if (allowsMockFallback(deps.mode)) {
        const mock = await deps.fetchFromMock(eventId)
        if (mock) return mock
    }

    throw new Error('Event not found')
}

export async function resolveEvent(
    eventId: string,
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean }
): Promise<Event> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveEventWithDeps(eventId, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: id => fetchSingleEventFromDb(id, mode),
        fetchFromMock: fetchEventFromMockProvider,
        fetchFromTicketmasterLive: id => fetchEventFromTicketmasterLive(id, mode),
    })
}

interface ResolveCitiesDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: () => Promise<string[] | null>
    fetchFromMock: () => Promise<string[]> | string[]
}

export async function resolveCitiesWithDeps(deps: ResolveCitiesDeps): Promise<string[]> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase()
        if (fromDb && fromDb.length > 0) return fromDb
        if (fromDb && !allowsMockFallback(deps.mode)) return fromDb
    }

    if (allowsMockFallback(deps.mode)) {
        return Promise.resolve(deps.fetchFromMock())
    }

    return []
}

export async function resolveCities(options?: {
    mode?: EventsProviderMode
    supabaseConfigured?: boolean
}): Promise<string[]> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveCitiesWithDeps({
        mode,
        supabaseConfigured,
        fetchFromDatabase: () => fetchCitiesFromDatabase(mode),
        fetchFromMock: () => mockEventsProvider.getCities(),
    })
}

export function useEvents(filters: EventFilters & { page?: number; pageSize?: number }) {
    return useQuery({
        queryKey: [...eventKeys.list(filters), env.EVENTS_PROVIDER, isSupabaseConfigured()],
        queryFn: () => resolveEvents(filters),
        staleTime: 1000 * 60 * 2,
    })
}

export function useEvent(eventId: string) {
    return useQuery({
        queryKey: [...eventKeys.detail(eventId), env.EVENTS_PROVIDER],
        queryFn: () => resolveEvent(eventId),
        enabled: !!eventId,
    })
}

export function useCities() {
    return useQuery({
        queryKey: ['cities', isSupabaseConfigured(), env.EVENTS_PROVIDER],
        queryFn: () => resolveCities(),
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
