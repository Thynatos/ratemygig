import { useQuery } from '@tanstack/react-query'
import { env, isSupabaseConfigured } from '@/shared/lib/env'
import { STALE_TIMES } from '@/shared/lib/constants'
import { eventKeys, resolveEvents, resolveEvent, resolveCities } from './resolver'
import type { EventFilters } from '@core/index'

export function useEvents(filters: EventFilters & { page?: number; pageSize?: number }) {
    return useQuery({
        queryKey: [...eventKeys.list(filters), env.EVENTS_PROVIDER, isSupabaseConfigured()],
        queryFn: () => resolveEvents(filters),
        staleTime: STALE_TIMES.EVENTS,
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
        staleTime: STALE_TIMES.CITIES,
    })
}
