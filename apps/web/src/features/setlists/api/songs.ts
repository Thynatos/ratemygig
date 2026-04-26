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