import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { sanitizeText } from '@/shared/lib/sanitize'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import type { Comment } from '@core/index'

export const commentKeys = {
    all: ['comments'] as const,
    byReview: (reviewId: string) => [...commentKeys.all, 'review', reviewId] as const,
    byUser: (userId: string) => [...commentKeys.all, 'user', userId] as const,
}

export interface CommentWithProfile extends Comment {
    profile: {
        id: string
        display_name: string | null
        username: string | null
        avatar_url: string | null
    } | null
}

export function useComments(reviewId: string) {
    return useQuery({
        queryKey: commentKeys.byReview(reviewId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    profile:profiles(id, display_name, username, avatar_url)
                `)
                .eq('review_id', reviewId)
                .order('created_at', { ascending: true })

            if (error) throw error
            return data as CommentWithProfile[]
        },
        enabled: !!reviewId,
    })
}

const commentCreateLimiter = createRateLimiter(RATE_LIMITS.COMMENT_CREATE)

export function useCreateComment(reviewId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (body: string) => {
            if (!commentCreateLimiter.allow()) {
                throw new Error('Please wait before posting another comment')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const sanitized = sanitizeText(body)
            if (!sanitized.trim()) throw new Error('Comment cannot be empty')

            const { data, error } = await supabase
                .from('comments')
                .insert({
                    review_id: reviewId,
                    user_id: user.id,
                    body: sanitized,
                })
                .select(`
                    *,
                    profile:profiles(id, display_name, username, avatar_url)
                `)
                .single()

            if (error) throw error
            return data as CommentWithProfile
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: commentKeys.byReview(reviewId) })
        },
    })
}

export function useDeleteComment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ commentId }: { commentId: string; reviewId: string }) => {
            if (!commentCreateLimiter.allow()) {
                throw new Error('Please wait before deleting comments again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: commentKeys.byReview(variables.reviewId) })
        },
    })
}
