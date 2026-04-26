import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { artistFollowKeys } from './hooks'

export function useFollowArtist(artistId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('artist_follows')
                .insert({ user_id: user.id, artist_id: artistId })

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: artistFollowKeys.isFollowing(artistId) })
            const prev = queryClient.getQueryData(artistFollowKeys.isFollowing(artistId))
            queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), true)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: artistFollowKeys.all })
        },
    })
}

export function useUnfollowArtist(artistId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('artist_follows')
                .delete()
                .eq('user_id', user.id)
                .eq('artist_id', artistId)

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: artistFollowKeys.isFollowing(artistId) })
            const prev = queryClient.getQueryData(artistFollowKeys.isFollowing(artistId))
            queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), false)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(artistFollowKeys.isFollowing(artistId), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: artistFollowKeys.all })
        },
    })
}
