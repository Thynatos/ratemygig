import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'

const followLimiter = createRateLimiter(RATE_LIMITS.FOLLOW)

export const userFollowKeys = {
    all: ['user-follows'] as const,
    isFollowing: (userId: string, viewerId: string) => [...userFollowKeys.all, 'is-following', userId, viewerId] as const,
    followers: (userId: string) => [...userFollowKeys.all, 'followers', userId] as const,
    following: (userId: string) => [...userFollowKeys.all, 'following', userId] as const,
    followerCount: (userId: string) => [...userFollowKeys.all, 'follower-count', userId] as const,
    followingCount: (userId: string) => [...userFollowKeys.all, 'following-count', userId] as const,
}

export function useIsFollowingUser(userId: string) {
    const { user } = useAuth()
    return useQuery({
        queryKey: userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous'),
        queryFn: async () => {
            if (!user) return false

            const { data, error } = await supabase
                .from('user_follows')
                .select('id')
                .eq('follower_id', user.id)
                .eq('following_id', userId)
                .maybeSingle()

            if (error) throw error
            return !!data
        },
        enabled: !!userId && !!user,
    })
}

export function useFollowers(userId: string) {
    return useQuery({
        queryKey: userFollowKeys.followers(userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_follows')
                .select('follower:profiles!user_follows_follower_profile_fkey(*)')
                .eq('following_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data.map((row: { follower: unknown }) => row.follower)
        },
        enabled: !!userId,
    })
}

export function useFollowing(userId: string) {
    return useQuery({
        queryKey: userFollowKeys.following(userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('user_follows')
                .select('following:profiles!user_follows_following_profile_fkey(*)')
                .eq('follower_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data.map((row: { following: unknown }) => row.following)
        },
        enabled: !!userId,
    })
}

export function useFollowerCount(userId: string) {
    return useQuery({
        queryKey: userFollowKeys.followerCount(userId),
        queryFn: async () => {
            const { count, error } = await supabase
                .from('user_follows')
                .select('id', { count: 'exact', head: true })
                .eq('following_id', userId)

            if (error) throw error
            return count ?? 0
        },
        enabled: !!userId,
    })
}

export function useFollowingCount(userId: string) {
    return useQuery({
        queryKey: userFollowKeys.followingCount(userId),
        queryFn: async () => {
            const { count, error } = await supabase
                .from('user_follows')
                .select('id', { count: 'exact', head: true })
                .eq('follower_id', userId)

            if (error) throw error
            return count ?? 0
        },
        enabled: !!userId,
    })
}

export function useFollowUser(userId: string) {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async () => {
            if (!followLimiter.allow()) {
                throw new Error('Please wait before following again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('user_follows')
                .insert({ follower_id: user.id, following_id: userId })

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous') })
            const prev = queryClient.getQueryData(userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous'))
            queryClient.setQueryData(userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous'), true)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous'), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userFollowKeys.all })
        },
    })
}

export function useUnfollowUser(userId: string) {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async () => {
            if (!followLimiter.allow()) {
                throw new Error('Please wait before unfollowing again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('user_follows')
                .delete()
                .eq('follower_id', user.id)
                .eq('following_id', userId)

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous') })
            const prev = queryClient.getQueryData(userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous'))
            queryClient.setQueryData(userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous'), false)
            return { prev }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev !== undefined) {
                queryClient.setQueryData(userFollowKeys.isFollowing(userId, user?.id ?? 'anonymous'), ctx.prev)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: userFollowKeys.all })
        },
    })
}