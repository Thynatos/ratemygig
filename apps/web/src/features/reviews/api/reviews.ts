import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import type { Review, ReviewPhoto } from '@core/index'

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

export function useCreateReview() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: ReviewInput) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('reviews')
                .insert({
                    user_id: user.id,
                    event_id: input.eventId,
                    rating: input.rating,
                    title: input.title || null,
                    body: input.body,
                    is_public: input.isPublic,
                })
                .select()
                .single()

            if (error) throw error

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
                    title: input.title || null,
                    body: input.body,
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
        mutationFn: async ({ reviewId, eventId }: { reviewId: string; eventId: string }) => {
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

// Photo upload
export function useUploadReviewPhotos() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ reviewId, files }: { reviewId: string; files: File[] }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const uploadedPhotos: ReviewPhoto[] = []

            for (const file of files) {
                const ext = file.name.split('.').pop()
                const path = `${user.id}/${reviewId}/${crypto.randomUUID()}.${ext}`

                const { error: uploadError } = await supabase.storage
                    .from('review-photos')
                    .upload(path, file)

                if (uploadError) throw uploadError

                const { data, error } = await supabase
                    .from('review_photos')
                    .insert({
                        review_id: reviewId,
                        storage_path: path,
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
        mutationFn: async ({ photoId, storagePath }: { photoId: string; storagePath: string }) => {
            // Delete from storage
            const { error: storageError } = await supabase.storage
                .from('review-photos')
                .remove([storagePath])

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
        staleTime: 1000 * 60 * 60, // 1 hour
    })
}
