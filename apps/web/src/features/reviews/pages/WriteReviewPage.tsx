import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, Eye, EyeOff, Save, Trash2 } from 'lucide-react'
import { useEvent } from '@/features/events/api/events'
import {
    useUserEventReview,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useUploadReviewPhotos,
    useTags
} from '../api/reviews'
import { usePhotoUrls } from '@/shared/hooks'
import { sanitizeText } from '@/shared/lib/sanitize'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { StarRating } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { Modal } from '@/shared/components/ui/Modal'
import { PhotoUploader } from '../components/PhotoUploader'
import { formatDate, cn } from '@/shared/lib/utils'

const reviewSchema = z.object({
    rating: z.number().min(1, 'Please select a rating').max(5),
    title: z.string().optional(),
    body: z.string().min(10, 'Review must be at least 10 characters'),
    isPublic: z.boolean(),
})

type ReviewFormData = z.infer<typeof reviewSchema>

export function WriteReviewPage() {
    const { eventId } = useParams<{ eventId: string }>()
    const navigate = useNavigate()

    const { data: event, isLoading: eventLoading } = useEvent(eventId!)
    const { data: existingReview, isLoading: reviewLoading } = useUserEventReview(eventId!)
    const { data: allTags = [] } = useTags()

    const createReview = useCreateReview()
    const updateReview = useUpdateReview()
    const deleteReview = useDeleteReview()
    const uploadPhotos = useUploadReviewPhotos()

    const [photos, setPhotos] = useState<{ id?: string; url: string; file?: File }[]>([])
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const isEditing = !!existingReview

    const existingPaths = existingReview?.photos?.map((p: { storage_path: string }) => p.storage_path) ?? []
    const existingThumbPaths = existingReview?.photos?.map((p: { thumbnail_path: string | null }) => p.thumbnail_path) ?? []
    const { urls: existingPhotoUrls, thumbUrls: existingThumbUrls } = usePhotoUrls(existingPaths, existingThumbPaths)

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ReviewFormData>({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            rating: 0,
            title: '',
            body: '',
            isPublic: true,
        },
    })

    const rating = watch('rating')
    const isPublic = watch('isPublic')

    // Load existing review data
    useEffect(() => {
        if (existingReview) {
            setValue('rating', existingReview.rating)
            setValue('title', existingReview.title || '')
            setValue('body', existingReview.body)
            setValue('isPublic', existingReview.is_public)
        }
    }, [existingReview, setValue])

    // Load existing photos with signed URLs (prefer thumbnails for editor preview)
    useEffect(() => {
        if (existingReview?.photos && existingPhotoUrls.size > 0) {
            setPhotos(existingReview.photos.map((p: { id: string; storage_path: string; thumbnail_path: string | null }) => {
                const thumbUrl = p.thumbnail_path ? existingThumbUrls.get(p.thumbnail_path) : null
                const fullUrl = existingPhotoUrls.get(p.storage_path) || ''
                return {
                    id: p.id,
                    url: thumbUrl || fullUrl,
                }
            }))
        }
    }, [existingReview, existingPhotoUrls, existingThumbUrls])

    const onSubmit = async (data: ReviewFormData) => {
        try {
            let reviewId = existingReview?.id

            if (isEditing && reviewId) {
                await updateReview.mutateAsync({
                    reviewId,
                    eventId: eventId!,
                    rating: data.rating,
                    title: data.title,
                    body: data.body,
                    isPublic: data.isPublic,
                    tagIds: selectedTags,
                })
            } else {
                const result = await createReview.mutateAsync({
                    eventId: eventId!,
                    rating: data.rating,
                    title: data.title,
                    body: data.body,
                    isPublic: data.isPublic,
                    tagIds: selectedTags,
                })
                reviewId = result.id
            }

            // Upload new photos
            const newPhotos = photos.filter(p => p.file)
            if (newPhotos.length > 0 && reviewId) {
                await uploadPhotos.mutateAsync({
                    reviewId,
                    files: newPhotos.map(p => p.file!),
                })
            }

            navigate('/my-gigs')
        } catch (error) {
            console.error('Failed to save review:', error)
        }
    }

    const handleDelete = async () => {
        if (!existingReview) return
        try {
            await deleteReview.mutateAsync({
                reviewId: existingReview.id,
                eventId: eventId!,
            })
            navigate('/my-gigs')
        } catch (error) {
            console.error('Failed to delete review:', error)
        }
    }

    const handleAddPhotos = (files: File[]) => {
        const newPhotos = files.map(file => ({
            url: URL.createObjectURL(file),
            file,
        }))
        setPhotos(prev => [...prev, ...newPhotos])
    }

    const handleRemovePhoto = (index: number) => {
        const photo = photos[index]
        if (photo.url.startsWith('blob:')) {
            URL.revokeObjectURL(photo.url)
        }
        setPhotos(prev => prev.filter((_, i) => i !== index))
    }

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        )
    }

    if (eventLoading || reviewLoading) {
        return <LoadingPage message="Loading..." />
    }

    if (!event) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <h2 className="text-xl font-semibold text-white mb-2">Event not found</h2>
                        <Link to="/my-gigs">
                            <Button variant="secondary">Back to My Gigs</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="page-container max-w-2xl mx-auto">
            {/* Back Button */}
            <Link
                to={`/events/${eventId}`}
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                Back to Event
            </Link>

            <Card>
                <CardContent className="p-6">
                    <h1 className="text-2xl font-display font-bold text-white mb-2">
                        {isEditing ? 'Edit Review' : 'Write a Review'}
                    </h1>
                    <p className="text-surface-400 mb-6">
                        {sanitizeText(event.name)} • {formatDate(event.start_at, 'MMM d, yyyy')}
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Rating */}
                        <div>
                            <label className="input-label">Your Rating *</label>
                            <div className="mt-2">
                                <StarRating
                                    value={rating}
                                    onChange={(value) => setValue('rating', value)}
                                    size="lg"
                                />
                            </div>
                            {errors.rating && (
                                <p className="input-error">{errors.rating.message}</p>
                            )}
                        </div>

                        {/* Title */}
                        <Input
                            label="Review Title (optional)"
                            placeholder="Sum up your experience..."
                            {...register('title')}
                        />

                        {/* Body */}
                        <Textarea
                            label="Your Review *"
                            placeholder="Share your experience at this concert..."
                            error={errors.body?.message}
                            {...register('body')}
                        />

                        {/* Tags */}
                        {allTags.length > 0 && (
                            <div>
                                <label className="input-label">Tags (optional)</label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {allTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => toggleTag(tag.id)}
                                            className={cn(
                                                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                                                selectedTags.includes(tag.id)
                                                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                                                    : 'bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600'
                                            )}
                                        >
                                            {sanitizeText(tag.name)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Photos */}
                        <PhotoUploader
                            photos={photos}
                            onAdd={handleAddPhotos}
                            onRemove={handleRemovePhoto}
                        />

                        {/* Privacy Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-surface-800 border border-surface-700">
                            <div className="flex items-center gap-3">
                                {isPublic ? (
                                    <Eye className="w-5 h-5 text-green-400" />
                                ) : (
                                    <EyeOff className="w-5 h-5 text-surface-400" />
                                )}
                                <div>
                                    <p className="font-medium text-white">
                                        {isPublic ? 'Public Review' : 'Private Review'}
                                    </p>
                                    <p className="text-sm text-surface-400">
                                        {isPublic
                                            ? 'Anyone can see this review'
                                            : 'Only you can see this review'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setValue('isPublic', !isPublic)}
                                className={cn(
                                    'relative w-12 h-6 rounded-full transition-colors',
                                    isPublic ? 'bg-green-500' : 'bg-surface-600'
                                )}
                            >
                                <span
                                    className={cn(
                                        'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                        isPublic ? 'translate-x-7' : 'translate-x-1'
                                    )}
                                />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4">
                            {isEditing && (
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={() => setShowDeleteModal(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            )}
                            <div className={cn('flex gap-3', !isEditing && 'ml-auto')}>
                                <Link to={`/events/${eventId}`}>
                                    <Button type="button" variant="secondary">Cancel</Button>
                                </Link>
                                <Button
                                    type="submit"
                                    isLoading={createReview.isPending || updateReview.isPending || uploadPhotos.isPending}
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isEditing ? 'Update Review' : 'Post Review'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete Review"
            >
                <p className="text-surface-300 mb-6">
                    Are you sure you want to delete this review? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={deleteReview.isPending}
                    >
                        Delete Review
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
