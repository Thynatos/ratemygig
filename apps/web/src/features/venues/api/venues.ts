import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { env, isSupabaseConfigured, type EventsProviderMode } from '@/shared/lib/env'
import { allowsMockFallback, getDatabaseProviderFilter } from '@/shared/lib/provider-policy'
import type { Venue, VenueRatingSummary, Event } from '@core/index'
import { mapEventRow, type EventRow } from '../../events/api/events'
import { getMockEventsByVenueId, getMockVenue, getMockVenues } from '../../events/providers/mock-catalog'

export const venueKeys = {
    all: ['venues'] as const,
    lists: () => [...venueKeys.all, 'list'] as const,
    list: (city?: string) => [...venueKeys.lists(), city] as const,
    details: () => [...venueKeys.all, 'detail'] as const,
    detail: (id: string) => [...venueKeys.details(), id] as const,
    ratings: (id: string, filters?: VenueRatingQuery) => [...venueKeys.all, 'ratings', id, filters] as const,
}

export type VenueRatingQuery = { city?: string; year?: number }

async function fetchVenuesFromDb(
    city?: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<Venue[] | null> {
    if (!isSupabaseConfigured()) return null

    const provider = getDatabaseProviderFilter(mode)
    let q = supabase.from('venues').select('*').order('name', { ascending: true })

    if (provider) {
        const { data: evs, error: eventsError } = await supabase.from('events').select('venue_id').eq('provider', provider)
        if (eventsError) throw eventsError

        const ids = [...new Set((evs || []).map(e => e.venue_id).filter(Boolean))] as string[]
        if (ids.length === 0) return []
        q = q.in('id', ids)
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

async function fetchVenueFromDb(
    venueId: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<Venue | null> {
    if (!isSupabaseConfigured()) return null

    const provider = getDatabaseProviderFilter(mode)
    if (provider) {
        const { data: scopedEvents, error: eventsError } = await supabase
            .from('events')
            .select('id')
            .eq('venue_id', venueId)
            .eq('provider', provider)
            .limit(1)

        if (eventsError) throw eventsError
        if (!scopedEvents?.length) return null
    }

    const { data, error } = await supabase.from('venues').select('*').eq('id', venueId).maybeSingle()
    if (error) throw error
    if (!data) return null

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

async function fetchVenuesFromMock(city?: string): Promise<Venue[]> {
    return getMockVenues(city)
}

async function fetchVenueFromMock(venueId: string): Promise<Venue | null> {
    return getMockVenue(venueId)
}

async function fetchVenueEventsFromDb(
    venueId: string,
    mode: EventsProviderMode = env.EVENTS_PROVIDER
): Promise<Event[] | null> {
    if (!isSupabaseConfigured()) return null

    let query = supabase
        .from('events')
        .select('*, venue:venues(*)')
        .eq('venue_id', venueId)
        .order('start_at', { ascending: true })

    const provider = getDatabaseProviderFilter(mode)
    if (provider) query = query.eq('provider', provider)

    const { data, error } = await query
    if (error) throw error
    if (!data?.length) return []

    return (data as EventRow[]).map(mapEventRow) as Event[]
}

async function fetchVenueEventsFromMock(venueId: string): Promise<Event[]> {
    return getMockEventsByVenueId(venueId)
}

export interface ResolveVenuesDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (city?: string) => Promise<Venue[] | null>
    fetchFromMock: (city?: string) => Promise<Venue[]>
}

export async function resolveVenuesWithDeps(city: string | undefined, deps: ResolveVenuesDeps): Promise<Venue[]> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase(city)
        if (fromDb && fromDb.length > 0) return fromDb
        if (fromDb && !allowsMockFallback(deps.mode)) return fromDb
    }

    if (allowsMockFallback(deps.mode)) {
        return deps.fetchFromMock(city)
    }

    return []
}

export async function resolveVenues(
    city?: string,
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean }
): Promise<Venue[]> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveVenuesWithDeps(city, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: nextCity => fetchVenuesFromDb(nextCity, mode),
        fetchFromMock: fetchVenuesFromMock,
    })
}

export interface ResolveVenueDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (venueId: string) => Promise<Venue | null>
    fetchFromMock: (venueId: string) => Promise<Venue | null>
}

export async function resolveVenueWithDeps(venueId: string, deps: ResolveVenueDeps): Promise<Venue> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase(venueId)
        if (fromDb) return fromDb
    }

    if (allowsMockFallback(deps.mode)) {
        const fromMock = await deps.fetchFromMock(venueId)
        if (fromMock) return fromMock
    }

    throw new Error('Venue not found')
}

export async function resolveVenue(
    venueId: string,
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean }
): Promise<Venue> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveVenueWithDeps(venueId, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: id => fetchVenueFromDb(id, mode),
        fetchFromMock: fetchVenueFromMock,
    })
}

export interface ResolveVenueEventsDeps {
    mode: EventsProviderMode
    supabaseConfigured: boolean
    fetchFromDatabase: (venueId: string) => Promise<Event[] | null>
    fetchFromMock: (venueId: string) => Promise<Event[]>
}

export async function resolveVenueEventsWithDeps(venueId: string, deps: ResolveVenueEventsDeps): Promise<Event[]> {
    if (deps.supabaseConfigured) {
        const fromDb = await deps.fetchFromDatabase(venueId)
        if (fromDb && fromDb.length > 0) return fromDb
        if (fromDb && !allowsMockFallback(deps.mode)) return fromDb
    }

    if (allowsMockFallback(deps.mode)) {
        return deps.fetchFromMock(venueId)
    }

    return []
}

export async function resolveVenueEvents(
    venueId: string,
    options?: { mode?: EventsProviderMode; supabaseConfigured?: boolean }
): Promise<Event[]> {
    const mode = options?.mode ?? env.EVENTS_PROVIDER
    const supabaseConfigured = options?.supabaseConfigured ?? isSupabaseConfigured()

    return resolveVenueEventsWithDeps(venueId, {
        mode,
        supabaseConfigured,
        fetchFromDatabase: id => fetchVenueEventsFromDb(id, mode),
        fetchFromMock: fetchVenueEventsFromMock,
    })
}

export function useVenues(city?: string) {
    return useQuery({
        queryKey: [...venueKeys.list(city), env.EVENTS_PROVIDER],
        queryFn: () => resolveVenues(city),
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
            return data?.[0] as VenueRatingSummary | null
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
