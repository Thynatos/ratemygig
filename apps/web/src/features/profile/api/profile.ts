import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { avatarKeys } from '@/features/profile/api/avatar'

export const profileKeys = {
    all: ['profiles'] as const,
    detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
}

export function useUpdateProfile() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            userId,
            ...updates
        }: {
            userId: string
            username?: string | null
            display_name?: string | null
            bio?: string | null
            is_profile_public?: boolean
            website_url?: string | null
            twitter_handle?: string | null
            instagram_handle?: string | null
        }) => {
            const sanitized: Record<string, unknown> = {}
            if (updates.username !== undefined) sanitized.username = updates.username || null
            if (updates.display_name !== undefined) sanitized.display_name = updates.display_name || null
            if (updates.bio !== undefined) sanitized.bio = updates.bio || null
            if (updates.is_profile_public !== undefined) sanitized.is_profile_public = updates.is_profile_public
            if (updates.website_url !== undefined) sanitized.website_url = updates.website_url || null
            if (updates.twitter_handle !== undefined) {
                const h = updates.twitter_handle
                sanitized.twitter_handle = h?.startsWith('@') ? h.slice(1) : (h || null)
            }
            if (updates.instagram_handle !== undefined) {
                const h = updates.instagram_handle
                sanitized.instagram_handle = h?.startsWith('@') ? h.slice(1) : (h || null)
            }

            const { data, error } = await supabase
                .from('profiles')
                .update(sanitized)
                .eq('id', userId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: profileKeys.detail(variables.userId) })
            queryClient.invalidateQueries({ queryKey: ['public-profile'] })
            queryClient.invalidateQueries({ queryKey: avatarKeys.all })
        },
    })
}
