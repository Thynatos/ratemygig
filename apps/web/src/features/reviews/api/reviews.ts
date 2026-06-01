import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { sanitizeText } from '@/shared/lib/sanitize'
import { createRateLimiter } from '@/shared/lib/throttle'
import { STALE_TIMES, RATE_LIMITS } from '@/shared/lib/constants'
import { resizeImage } from '@/shared/lib/avatar-storage'
import type { Review, ReviewPhoto, ReactionType } from '@core/index'

// Query keys
export const reviewKeys = {
    all: ['reviews'] as const,
    lists: () => [...reviewKeys.all, 'list'] as const,
    eventReviews: (eventId: string) => [...reviewKeys.lists(), 'event', eventId] as const,
    userReviews: (userId: string) => [...reviewKeys.lists(), 'user', userId] as const,
    details: () => [...reviewKeys.all, 'detail'] as const,
    detail: (id: string) => [...reviewKeys.details(), id] as const,
}

// Fetch reviews for an event
export function useEventReviews(eventId: string) {
    return useQuery({
        queryKey: reviewKeys.eventReviews(eventId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          profile:profiles(id, display_name, avatar_url, username),
          photos:review_photos(*)
        `)
                .eq('event_id', eventId)
                .eq('is_public', true)
                .eq('status', 'published')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as (Review & { profile: { id: string; display_name: string; avatar_url: string; username: string }; photos: ReviewPhoto[] })[]
        },
        enabled: !!eventId,
    })
}

// Fetch single review
export function useReview(reviewId: string) {
    return useQuery({
        queryKey: reviewKeys.detail(reviewId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          profile:profiles(id, display_name, avatar_url, username, is_profile_public),
          event:events(*,venue:venues(*)),
          photos:review_photos(*)
        `)
                .eq('id', reviewId)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!reviewId,
    })
}

// Fetch user's review for an event
export function useUserEventReview(eventId: string) {
    return useQuery({
        queryKey: ['user-review', eventId],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await supabase
                .from('reviews')
                .select('*, photos:review_photos(*)')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .single()

            if (error && error.code !== 'PGRST116') throw error
            return data
        },
    })
}

// Fetch user's gigs (attendance + reviews)
export function useMyGigs(status?: 'planned' | 'attended') {
    return useQuery({
        queryKey: ['my-gigs', status],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            let query = supabase
                .from('attendance')
                .select(`
          *,
          event:events(*,venue:venues(*)),
          review:reviews(*)
        `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (status) {
                query = query.eq('status', status)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        },
    })
}

// Create/update review
interface ReviewInput {
    eventId: string
    rating: number
    title?: string
    body: string
    isPublic: boolean
    tagIds?: string[]
}

const reviewCreateLimiter = createRateLimiter(RATE_LIMITS.REVIEW_CREATE)

export function useCreateReview() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: ReviewInput) => {
            if (!reviewCreateLimiter.allow()) {
                throw new Error('Please wait before submitting another review')
            }
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('reviews')
                .insert({
                    user_id: user.id,
                    event_id: input.eventId,
                    rating: input.rating,
                    title: input.title ? sanitizeText(input.title) : null,
                    body: sanitizeText(input.body),
                    is_public: input.isPublic,
                })
                .select()
                .single()

            if (error) throw error

            // Ensure attendance record exists (mark as attended when reviewing)
            const { data: existingAttendance } = await supabase
                .from('attendance')
                .select('id')
                .eq('event_id', input.eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (existingAttendance) {
                await supabase
                    .from('attendance')
                    .update({ status: 'attended' })
                    .eq('id', existingAttendance.id)
            } else {
                await supabase
                    .from('attendance')
                    .insert({ event_id: input.eventId, user_id: user.id, status: 'attended' })
            }

            // Add tags if provided
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
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: reviewKeys.eventReviews(variables.eventId) })
            queryClient.invalidateQueries({ queryKey: ['user-review', variables.eventId] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}

export function useUpdateReview() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ reviewId, ...input }: ReviewInput & { reviewId: string }) => {
            const { data, error } = await supabase
                .from('reviews')
                .update({
                    rating: input.rating,
                    title: input.title ? sanitizeText(input.title) : null,
                    body: sanitizeText(input.body),
                    is_public: input.isPublic,
                })
                .eq('id', reviewId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: reviewKeys.detail(data.id) })
            queryClient.invalidateQueries({ queryKey: reviewKeys.eventReviews(data.event_id) })
            queryClient.invalidateQueries({ queryKey: ['user-review', data.event_id] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}

export function useDeleteReview() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ reviewId }: { reviewId: string; eventId: string }) => {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', reviewId)

            if (error) throw error
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: reviewKeys.eventReviews(variables.eventId) })
            queryClient.invalidateQueries({ queryKey: ['user-review', variables.eventId] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}

const photoUploadLimiter = createRateLimiter(RATE_LIMITS.PHOTO_UPLOAD)

// Photo upload with client-side resize + thumbnail generation
export function useUploadReviewPhotos() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ reviewId, files }: { reviewId: string; files: File[] }) => {
            if (!photoUploadLimiter.allow()) {
                throw new Error('Please wait before uploading more photos')
            }
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const uploadedPhotos: ReviewPhoto[] = []

            for (const file of files) {
                const ext = file.name.split('.').pop()
                const uuid = crypto.randomUUID()
                const path = `${user.id}/${reviewId}/${uuid}.${ext}`
                const thumbPath = `${user.id}/${reviewId}/thumbs/${uuid}.${ext}`

                // Resize original to max 1200px
                const resizedOriginal = await resizeImage(file, 1200)
                // Generate 300px thumbnail
                const thumbnail = await resizeImage(file, 300)

                // Upload original
                const { error: uploadError } = await supabase.storage
                    .from('review-photos')
                    .upload(path, resizedOriginal, {
                        contentType: file.type,
                    })
                if (uploadError) throw uploadError

                // Upload thumbnail
                const { error: thumbError } = await supabase.storage
                    .from('review-photos')
                    .upload(thumbPath, thumbnail, {
                        contentType: file.type,
                    })
                if (thumbError) throw thumbError

                const { data, error } = await supabase
                    .from('review_photos')
                    .insert({
                        review_id: reviewId,
                        storage_path: path,
                        thumbnail_path: thumbPath,
                    })
                    .select()
                    .single()

                if (error) throw error
                uploadedPhotos.push(data)
            }

            return uploadedPhotos
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-review'] })
        },
    })
}

export function useDeleteReviewPhoto() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ photoId, storagePath, thumbnailPath }: { photoId: string; storagePath: string; thumbnailPath?: string | null }) => {
            // Delete from storage (original + thumbnail)
            const pathsToRemove = [storagePath]
            if (thumbnailPath) pathsToRemove.push(thumbnailPath)

            const { error: storageError } = await supabase.storage
                .from('review-photos')
                .remove(pathsToRemove)

            if (storageError) console.error('Failed to delete from storage:', storageError)

            // Delete from database
            const { error } = await supabase
                .from('review_photos')
                .delete()
                .eq('id', photoId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-review'] })
        },
    })
}

// Get tags
export function useTags() {
    return useQuery({
        queryKey: ['tags'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tags')
                .select('*')
                .order('category', { ascending: true })

            if (error) throw error
            return data
        },
        staleTime: STALE_TIMES.TAGS,
    })
}

// ============================================
// Review Reaction Hooks
// ============================================

export const reactionKeys = {
    all: ['review-reactions'] as const,
    forReview: (reviewId: string) => [...reactionKeys.all, 'review', reviewId] as const,
    userReaction: (reviewId: string) => [...reactionKeys.all, 'user', reviewId] as const,
}

interface ReactionRow {
    id: string
    user_id: string
    review_id: string
    reaction_type: ReactionType
    created_at: string
}

interface ReactionSummary {
    like: number
    helpful: number
    love: number
}

interface UserReactions {
    like: boolean
    helpful: boolean
    love: boolean
}

const reactionLimiter = createRateLimiter(RATE_LIMITS.REACTION)

export function useReviewReactions(reviewId: string) {
    return useQuery({
        queryKey: reactionKeys.forReview(reviewId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('review_reactions')
                .select('*')
                .eq('review_id', reviewId)

            if (error) throw error

            const reactions = data as ReactionRow[]
            const summary: ReactionSummary = { like: 0, helpful: 0, love: 0 }
            for (const r of reactions) {
                summary[r.reaction_type] = (summary[r.reaction_type] ?? 0) + 1
            }
            return summary
        },
        enabled: !!reviewId,
    })
}

export function useUserReactions(reviewId: string) {
    return useQuery({
        queryKey: reactionKeys.userReaction(reviewId),
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return { like: false, helpful: false, love: false } as UserReactions

            const { data, error } = await supabase
                .from('review_reactions')
                .select('reaction_type')
                .eq('user_id', user.id)
                .eq('review_id', reviewId)

            if (error) throw error

            const result: UserReactions = { like: false, helpful: false, love: false }
            for (const row of (data as { reaction_type: ReactionType }[])) {
                result[row.reaction_type] = true
            }
            return result
        },
        enabled: !!reviewId,
    })
}

export function useReactToReview(reviewId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (reactionType: ReactionType) => {
            if (!reactionLimiter.allow()) {
                throw new Error('Please wait before reacting again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('review_reactions')
                .insert({
                    user_id: user.id,
                    review_id: reviewId,
                    reaction_type: reactionType,
                })

            if (error) throw error
        },
        onMutate: async (reactionType) => {
            await queryClient.cancelQueries({ queryKey: reactionKeys.forReview(reviewId) })
            await queryClient.cancelQueries({ queryKey: reactionKeys.userReaction(reviewId) })

            const prevSummary = queryClient.getQueryData<ReactionSummary>(reactionKeys.forReview(reviewId))
            const prevUser = queryClient.getQueryData<UserReactions>(reactionKeys.userReaction(reviewId))

            if (prevSummary) {
                const updated = { ...prevSummary }
                updated[reactionType] = (updated[reactionType] ?? 0) + 1
                queryClient.setQueryData(reactionKeys.forReview(reviewId), updated)
            }

            if (prevUser) {
                queryClient.setQueryData(reactionKeys.userReaction(reviewId), {
                    ...prevUser,
                    [reactionType]: true,
                })
            }

            return { prevSummary, prevUser }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prevSummary) {
                queryClient.setQueryData(reactionKeys.forReview(reviewId), ctx.prevSummary)
            }
            if (ctx?.prevUser) {
                queryClient.setQueryData(reactionKeys.userReaction(reviewId), ctx.prevUser)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reactionKeys.all })
        },
    })
}

export function useRemoveReaction(reviewId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (reactionType: ReactionType) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('review_reactions')
                .delete()
                .eq('user_id', user.id)
                .eq('review_id', reviewId)
                .eq('reaction_type', reactionType)

            if (error) throw error
        },
        onMutate: async (reactionType) => {
            await queryClient.cancelQueries({ queryKey: reactionKeys.forReview(reviewId) })
            await queryClient.cancelQueries({ queryKey: reactionKeys.userReaction(reviewId) })

            const prevSummary = queryClient.getQueryData<ReactionSummary>(reactionKeys.forReview(reviewId))
            const prevUser = queryClient.getQueryData<UserReactions>(reactionKeys.userReaction(reviewId))

            if (prevSummary) {
                const updated = { ...prevSummary }
                updated[reactionType] = Math.max(0, (updated[reactionType] ?? 0) - 1)
                queryClient.setQueryData(reactionKeys.forReview(reviewId), updated)
            }

            if (prevUser) {
                queryClient.setQueryData(reactionKeys.userReaction(reviewId), {
                    ...prevUser,
                    [reactionType]: false,
                })
            }

            return { prevSummary, prevUser }
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prevSummary) {
                queryClient.setQueryData(reactionKeys.forReview(reviewId), ctx.prevSummary)
            }
            if (ctx?.prevUser) {
                queryClient.setQueryData(reactionKeys.userReaction(reviewId), ctx.prevUser)
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: reactionKeys.all })
        },
    })
}
