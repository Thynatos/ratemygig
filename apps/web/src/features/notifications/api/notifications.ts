import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { NOTIFICATION_REFETCH_INTERVAL } from '@/shared/lib/constants'
import type { Notification as NotificationType } from '@core/index'

export const notificationKeys = {
    all: ['notifications'] as const,
    user: (userId: string) => [...notificationKeys.all, userId] as const,
    unreadCount: (userId: string) => [...notificationKeys.all, 'unread', userId] as const,
}

export function useNotifications() {
    const { user } = useAuth()

    return useQuery({
        queryKey: notificationKeys.user(user?.id ?? ''),
        queryFn: async () => {
            if (!user) return []

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            return (data || []) as NotificationType[]
        },
        enabled: !!user,
    })
}

export function useUnreadNotificationCount() {
    const { user } = useAuth()

    return useQuery({
        queryKey: notificationKeys.unreadCount(user?.id ?? ''),
        queryFn: async () => {
            if (!user) return 0

            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('is_read', false)

            if (error) throw error
            return count ?? 0
        },
        enabled: !!user,
        refetchInterval: NOTIFICATION_REFETCH_INTERVAL,
    })
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.all })
        },
    })
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', authUser.id)
                .eq('is_read', false)

            if (error) throw error
        },
        onSuccess: () => {
            if (user) {
                queryClient.invalidateQueries({ queryKey: notificationKeys.user(user.id) })
                queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(user.id) })
            }
        },
    })
}