import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import type { Song } from '@core/index'

const songCreateLimiter = createRateLimiter(RATE_LIMITS.SONG_CREATE)

export const songKeys = {
    all: ['songs'] as const,
    search: (query: string, artistId?: string) => [...songKeys.all, 'search', query, artistId] as const,
    detail: (id: string) => [...songKeys.all, 'detail', id] as const,
}

export interface SongLookupDeps {
    findSongId: (name: string, artistId: string | null) => Promise<string | null>
    insertSong: (name: string, artistId: string | null) => Promise<string>
}

export function isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505'
}

/**
 * Get-or-create a song under UNIQUE(name, artist_id). A concurrent insert of
 * the same song loses the race with a unique violation; the winner's row is
 * then re-read instead of failing the whole save.
 */
export async function getOrCreateSongIdWithDeps(
    name: string,
    artistId: string | null,
    deps: SongLookupDeps
): Promise<string> {
    const existing = await deps.findSongId(name, artistId)
    if (existing) return existing

    try {
        return await deps.insertSong(name, artistId)
    } catch (error) {
        if (!isUniqueViolation(error)) throw error
        const raced = await deps.findSongId(name, artistId)
        if (raced) return raced
        throw error
    }
}

async function findSongId(name: string, artistId: string | null): Promise<string | null> {
    const query = supabase.from('songs').select('id').eq('name', name)
    // PostgREST's `is` only accepts null/true/false: `.is('artist_id', <uuid>)`
    // is a 400 (PGRST100), so artist-scoped lookups must use `eq`. NULLs are
    // distinct under the unique constraint, so NULL-artist names can repeat —
    // hence limit(1) rather than maybeSingle().
    const { data, error } = await (artistId ? query.eq('artist_id', artistId) : query.is('artist_id', null))
        .order('created_at', { ascending: true })
        .limit(1)

    if (error) throw error
    return data?.[0]?.id ?? null
}

async function insertSong(name: string, artistId: string | null): Promise<string> {
    const { data, error } = await supabase
        .from('songs')
        .insert({ name, artist_id: artistId })
        .select('id')
        .single()

    if (error) throw error
    return data.id as string
}

export function getOrCreateSongId(name: string, artistId: string | null): Promise<string> {
    return getOrCreateSongIdWithDeps(name, artistId, { findSongId, insertSong })
}

export function useSongSearch(query: string, artistId?: string) {
    return useQuery({
        queryKey: songKeys.search(query, artistId),
        queryFn: async () => {
            if (!query.trim()) return []

            let q = supabase
                .from('songs')
                .select('*')
                .ilike('name', `%${query.trim()}%`)
                .order('name')
                .limit(20)

            if (artistId) {
                q = q.eq('artist_id', artistId)
            }

            const { data, error } = await q
            if (error) throw error
            return data as Song[]
        },
        enabled: query.trim().length > 0,
    })
}

export function useCreateSong() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ name, artistId }: { name: string; artistId?: string }) => {
            if (!songCreateLimiter.allow()) {
                throw new Error('Please wait before creating another song')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('songs')
                .upsert(
                    { name: name.trim(), artist_id: artistId || null },
                    { onConflict: 'name,artist_id', ignoreDuplicates: true }
                )
                .select()
                .single()

            if (error) throw error
            return data as Song
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: songKeys.all })
        },
    })
}