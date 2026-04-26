import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import { artistFollowKeys } from './hooks'

const followLimiter = createRateLimiter(RATE_LIMITS.FOLLOW)

export function useFollowArtist(artistId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            if (!followLimiter.allow()) {
                throw new Error('Please wait before following again')
            }

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
            if (!followLimiter.allow()) {
                throw new Error('Please wait before unfollowing again')
            }

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
