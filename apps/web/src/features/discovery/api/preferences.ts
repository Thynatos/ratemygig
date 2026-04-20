import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { discoveryKeys } from './discovery'
import type { UserPreferences } from '@core/index'

export const preferenceKeys = {
    all: ['preferences'] as const,
    user: (userId: string) => [...preferenceKeys.all, userId] as const,
}

export function useUserPreferences() {
    const { user } = useAuth()

    return useQuery({
        queryKey: preferenceKeys.user(user?.id ?? ''),
        queryFn: async () => {
            if (!user) return null

            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle()

            if (error) throw error
            return data as UserPreferences | null
        },
        enabled: !!user,
    })
}

export function useUpdatePreferences() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (prefs: Partial<Pick<UserPreferences, 'preferred_city' | 'preferred_lat' | 'preferred_lng'>>) => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: authUser.id,
                    preferred_city: prefs.preferred_city ?? null,
                    preferred_lat: prefs.preferred_lat ?? null,
                    preferred_lng: prefs.preferred_lng ?? null,
                }, { onConflict: 'user_id' })
                .select()
                .single()

            if (error) throw error
            return data as UserPreferences
        },
        onSuccess: () => {
            if (user) {
                queryClient.invalidateQueries({ queryKey: preferenceKeys.user(user.id) })
            }
            queryClient.invalidateQueries({ queryKey: discoveryKeys.all })
        },
    })
}

export function useClearPreferences() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('user_preferences')
                .delete()
                .eq('user_id', authUser.id)

            if (error) throw error
        },
        onSuccess: () => {
            if (user) {
                queryClient.invalidateQueries({ queryKey: preferenceKeys.user(user.id) })
            }
            queryClient.invalidateQueries({ queryKey: discoveryKeys.all })
        },
    })
}