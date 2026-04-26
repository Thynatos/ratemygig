import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import { venueFollowKeys } from './hooks'

const followLimiter = createRateLimiter(RATE_LIMITS.FOLLOW)

export function useFollowVenue(venueId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            if (!followLimiter.allow()) {
                throw new Error('Please wait before following again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('venue_follows')
                .insert({ user_id: user.id, venue_id: venueId })

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: venueFollowKeys.isFollowing(venueId) })
            const prev = queryClient.getQueryData(venueFollowKeys.isFollowing(venueId))
            queryClient.setQueryData(venueFollowKeys.isFollowing(venueId), true)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(venueFollowKeys.isFollowing(venueId), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: venueFollowKeys.all })
        },
    })
}

export function useUnfollowVenue(venueId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            if (!followLimiter.allow()) {
                throw new Error('Please wait before unfollowing again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('venue_follows')
                .delete()
                .eq('user_id', user.id)
                .eq('venue_id', venueId)

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: venueFollowKeys.isFollowing(venueId) })
            const prev = queryClient.getQueryData(venueFollowKeys.isFollowing(venueId))
            queryClient.setQueryData(venueFollowKeys.isFollowing(venueId), false)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(venueFollowKeys.isFollowing(venueId), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: venueFollowKeys.all })
        },
    })
}
