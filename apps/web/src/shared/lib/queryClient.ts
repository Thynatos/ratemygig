import { QueryClient } from '@tanstack/react-query'
import { STALE_TIMES, QUERY_DEFAULTS } from '@/shared/lib/constants'

/**
 * "Not found" is a definitive answer, not a transient failure — retrying it
 * wastes time and delays the empty-state render. Covers both error shapes:
 *   1. Resolver throws  Error('Artist not found') etc.
 *   2. Supabase `.single()` with 0 rows  →  PostgREST PGRST116
 */
export function retryUnlessNotFound(failureCount: number, error: unknown): boolean {
    if (error instanceof Error && /not found/i.test(error.message)) return false
    if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: unknown }).code === 'PGRST116'
    ) {
        return false
    }
    return failureCount < QUERY_DEFAULTS.RETRY
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: STALE_TIMES.DEFAULT,
            retry: retryUnlessNotFound,
            refetchOnWindowFocus: false,
        },
    },
})
