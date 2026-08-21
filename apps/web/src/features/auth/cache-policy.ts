import type { AuthChangeEvent } from '@supabase/supabase-js'

export function shouldClearQueryCache(
    event: AuthChangeEvent,
    previousUserId: string | null,
    nextUserId: string | null
): boolean {
    if (event === 'SIGNED_OUT') return true
    return previousUserId !== null && previousUserId !== nextUserId
}
