import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import { uploadAvatar, deleteAvatar } from '@/shared/lib/avatar-storage'

const avatarUploadLimiter = createRateLimiter(RATE_LIMITS.PHOTO_UPLOAD)

export const avatarKeys = {
    all: ['avatars'] as const,
    user: (userId: string) => [...avatarKeys.all, 'user', userId] as const,
}

export function useUploadAvatar() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ userId, file }: { userId: string; file: File }) => {
            if (!avatarUploadLimiter.allow()) {
                throw new Error('Please wait before uploading another photo')
            }

            const publicUrl = await uploadAvatar(userId, file)

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId)

            if (error) throw error

            return publicUrl
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: avatarKeys.user(variables.userId) })
            queryClient.invalidateQueries({ queryKey: ['public-profile'] })
            queryClient.invalidateQueries({ queryKey: ['profiles'] })
        },
    })
}

export function useRemoveAvatar() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ userId }: { userId: string }) => {
            await deleteAvatar(userId)

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', userId)

            if (error) throw error
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: avatarKeys.user(variables.userId) })
            queryClient.invalidateQueries({ queryKey: ['public-profile'] })
            queryClient.invalidateQueries({ queryKey: ['profiles'] })
        },
    })
}
