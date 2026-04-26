import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { sanitizeText } from '@/shared/lib/sanitize'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import type { Review } from '@core/index'

const draftSaveLimiter = createRateLimiter(RATE_LIMITS.REVIEW_CREATE)

export const draftKeys = {
    all: ['drafts'] as const,
    byUser: () => [...draftKeys.all, 'user'] as const,
}

export function useDrafts() {
    return useQuery({
        queryKey: draftKeys.byUser(),
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await supabase
                .from('reviews')
                .select(`
                    *,
                    event:events(*, venue:venues(*))
                `)
                .eq('user_id', user.id)
                .eq('status', 'draft')
                .order('updated_at', { ascending: false })

            if (error) throw error
            return data as (Review & { event: { id: string; name: string; start_at: string; venue: { name: string } | null } | null })[]
        },
    })
}

export function useSaveDraft() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: {
            eventId: string
            rating: number
            title?: string
            body: string
            isPublic?: boolean
            tagIds?: string[]
        }) => {
            if (!draftSaveLimiter.allow()) {
                throw new Error('Please wait before saving another draft')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: existing } = await supabase
                .from('reviews')
                .select('id')
                .eq('event_id', input.eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (existing) {
                const { data, error } = await supabase
                    .from('reviews')
                    .update({
                        rating: input.rating,
                        title: input.title ? sanitizeText(input.title) : null,
                        body: sanitizeText(input.body),
                        is_public: input.isPublic ?? false,
                        status: 'draft',
                    })
                    .eq('id', existing.id)
                    .select()
                    .single()

                if (error) throw error
                return data
            } else {
                const { data, error } = await supabase
                    .from('reviews')
                    .insert({
                        user_id: user.id,
                        event_id: input.eventId,
                        rating: input.rating,
                        title: input.title ? sanitizeText(input.title) : null,
                        body: sanitizeText(input.body),
                        is_public: input.isPublic ?? false,
                        status: 'draft',
                    })
                    .select()
                    .single()

                if (error) throw error

                if (input.tagIds && input.tagIds.length > 0) {
                    const { error: tagError } = await supabase
                        .from('review_tags')
                        .insert(input.tagIds.map(tagId => ({
                            review_id: data.id,
                            tag_id: tagId,
                        })))
                    if (tagError) console.error('Failed to add tags:', tagError)
                }

                return data
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: draftKeys.byUser() })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}

export function usePublishDraft() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (reviewId: string) => {
            const { data, error } = await supabase
                .from('reviews')
                .update({
                    status: 'published',
                    is_public: true,
                })
                .eq('id', reviewId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: draftKeys.byUser() })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
            queryClient.invalidateQueries({ queryKey: ['reviews'] })
        },
    })
}
