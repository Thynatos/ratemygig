import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { sanitizeText } from '@/shared/lib/sanitize'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import { generateId } from '@/shared/lib/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'
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

export function applyCommentAdded(comments: CommentWithProfile[], comment: CommentWithProfile): CommentWithProfile[] {
    return [...comments, comment].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function applyCommentRemoved(comments: CommentWithProfile[], commentId: string): CommentWithProfile[] {
    return comments.filter((comment) => comment.id !== commentId)
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
    const { user } = useAuth()

    return useMutation({
        mutationFn: async (body: string) => {
            if (!commentCreateLimiter.allow()) {
                throw new Error('Please wait before posting another comment')
            }

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
        onMutate: async (body) => {
            await queryClient.cancelQueries({ queryKey: commentKeys.byReview(reviewId) })

            const prev = queryClient.getQueryData<CommentWithProfile[]>(commentKeys.byReview(reviewId))
            if (prev) {
                const now = new Date().toISOString()
                queryClient.setQueryData(commentKeys.byReview(reviewId), applyCommentAdded(prev, {
                    id: generateId(),
                    review_id: reviewId,
                    user_id: user?.id ?? '',
                    body: sanitizeText(body),
                    created_at: now,
                    updated_at: now,
                    profile: null,
                }))
            }

            return { prev }
        },
        onError: (_err, _body, ctx) => {
            if (ctx?.prev) {
                queryClient.setQueryData(commentKeys.byReview(reviewId), ctx.prev)
            }
        },
        onSettled: () => {
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
        onMutate: async ({ commentId, reviewId }) => {
            await queryClient.cancelQueries({ queryKey: commentKeys.byReview(reviewId) })

            const prev = queryClient.getQueryData<CommentWithProfile[]>(commentKeys.byReview(reviewId))
            if (prev) {
                queryClient.setQueryData(commentKeys.byReview(reviewId), applyCommentRemoved(prev, commentId))
            }

            return { prev }
        },
        onError: (_err, variables, ctx) => {
            if (ctx?.prev) {
                queryClient.setQueryData(commentKeys.byReview(variables.reviewId), ctx.prev)
            }
        },
        onSettled: (_data, _err, variables) => {
            queryClient.invalidateQueries({ queryKey: commentKeys.byReview(variables.reviewId) })
        },
    })
}
