import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft } from 'lucide-react'
import { useEvent } from '@/features/events/api/events'
import {
    useUserEventReview,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useUploadReviewPhotos,
    useTags,
} from '../api/reviews'
import { usePhotoUrls } from '@/shared/hooks'
import { sanitizeText } from '@/shared/lib/sanitize'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { StarRating } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { Modal } from '@/shared/components/ui/Modal'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
import { PhotoUploader } from '../components/PhotoUploader'
import { formatDate, cn } from '@/shared/lib/utils'

const reviewSchema = z.object({
    rating: z.number().min(1, 'Pick a score from 1 to 5.').max(5),
    title: z.string().optional(),
    body: z.string().min(10, 'Write at least 10 characters so the review says something.'),
    isPublic: z.boolean(),
})

type ReviewFormData = z.infer<typeof reviewSchema>

/** A form field group on the board: label rail above, control below. */
function Field({
    label,
    hint,
    error,
    children,
    id,
}: {
    label: string
    hint?: string
    error?: string
    children: React.ReactNode
    id?: string
}) {
    return (
        <div className="border-b border-rail px-4 py-5">
            <p className="voice-label text-bone-dim mb-1" id={id}>
                {label}
            </p>
            {hint && <p className="text-ui-sm text-bone-faint mb-3">{hint}</p>}
            <div className={hint ? undefined : 'mt-3'}>{children}</div>
            {error && <p className="input-error">{error}</p>}
        </div>
    )
}

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
    const [submitError, setSubmitError] = useState<string | null>(null)

    const isEditing = !!existingReview

    const existingPaths =
        existingReview?.photos?.map((p: { storage_path: string }) => p.storage_path) ?? []
    const existingThumbPaths =
        existingReview?.photos?.map((p: { thumbnail_path: string | null }) => p.thumbnail_path) ??
        []
    const { urls: existingPhotoUrls, thumbUrls: existingThumbUrls } = usePhotoUrls(
        existingPaths,
        existingThumbPaths
    )

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<ReviewFormData>({
        resolver: zodResolver(reviewSchema),
        defaultValues: {
            rating: 0,
            title: '',
            body: '',
            isPublic: true,
        },
    })

    const rating = useWatch({ control, name: 'rating' })
    const isPublic = useWatch({ control, name: 'isPublic' })

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
    const [prevPhotoDeps, setPrevPhotoDeps] = useState<
        readonly [unknown, unknown, unknown] | null
    >(null)
    if (
        existingReview?.photos &&
        existingPhotoUrls.size > 0 &&
        (!prevPhotoDeps ||
            prevPhotoDeps[0] !== existingReview ||
            prevPhotoDeps[1] !== existingPhotoUrls ||
            prevPhotoDeps[2] !== existingThumbUrls)
    ) {
        setPrevPhotoDeps([existingReview, existingPhotoUrls, existingThumbUrls])
        setPhotos(
            existingReview.photos.map(
                (p: { id: string; storage_path: string; thumbnail_path: string | null }) => {
                    const thumbUrl = p.thumbnail_path
                        ? existingThumbUrls.get(p.thumbnail_path)
                        : null
                    const fullUrl = existingPhotoUrls.get(p.storage_path) || ''
                    return {
                        id: p.id,
                        url: thumbUrl || fullUrl,
                    }
                }
            )
        )
    }

    const onSubmit = async (data: ReviewFormData) => {
        setSubmitError(null)
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
            setSubmitError(
                'The review did not save. Your text is still here — try posting it again.'
            )
        }
    }

    const handleDelete = async () => {
        if (!existingReview) return
        setSubmitError(null)
        try {
            await deleteReview.mutateAsync({
                reviewId: existingReview.id,
                eventId: eventId!,
            })
            navigate('/my-gigs')
        } catch (error) {
            console.error('Failed to delete review:', error)
            setShowDeleteModal(false)
            setSubmitError('The review could not be deleted. It is still on your profile.')
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
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        )
    }

    if (eventLoading || reviewLoading) {
        return <LoadingPage message="Opening your review" />
    }

    if (!event) {
        return (
            <div className="page page-body">
                <EmptyState
                    title="No such gig"
                    body="There's nothing to review at this address."
                    action={
                        <Link to="/my-gigs" className="btn-secondary">
                            Back to my gigs
                        </Link>
                    }
                />
            </div>
        )
    }

    const isSaving = createReview.isPending || updateReview.isPending || uploadPhotos.isPending

    return (
        <div className="page page-body max-w-3xl">
            <Link
                to={`/events/${eventId}`}
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Back to the gig
            </Link>

            <BoardHeader
                strip={formatDate(event.start_at, 'EEE d MMM yyyy')}
                title={isEditing ? 'Edit your review' : 'Rate the night'}
                lede={
                    <>
                        {sanitizeText(event.name)} ·{' '}
                        {sanitizeText(event.venue?.name || 'Venue unknown')}
                    </>
                }
            />

            {submitError && (
                <div
                    role="alert"
                    className="border border-struck bg-board px-4 py-3 mb-6 text-ui text-bone"
                >
                    <span className="voice-label text-struck block mb-1">Not saved</span>
                    {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="border border-rail bg-board">
                    <Field
                        label="Your score"
                        hint="One to five. Be honest — this is your record, not a review site."
                        error={errors.rating?.message}
                    >
                        <StarRating
                            value={rating}
                            onChange={value => setValue('rating', value, { shouldValidate: true })}
                            size="lg"
                            label="Your score for this gig"
                        />
                    </Field>

                    <Field label="Headline" hint="Optional. One line you'd remember it by.">
                        <Input
                            placeholder="Best sound I've heard in that room"
                            {...register('title')}
                        />
                    </Field>

                    <Field
                        label="What was it like"
                        hint="The set, the room, the crowd, the sound. Whatever you want to remember."
                        error={errors.body?.message}
                    >
                        <Textarea
                            placeholder="They opened with the new one and the room went quiet…"
                            aria-invalid={errors.body ? true : undefined}
                            {...register('body')}
                        />
                    </Field>

                    {allTags.length > 0 && (
                        <Field label="Tags" hint="Optional. Pick anything that fits the night.">
                            <div className="flex flex-wrap gap-1.5">
                                {allTags.map(tag => {
                                    const active = selectedTags.includes(tag.id)
                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => toggleTag(tag.id)}
                                            aria-pressed={active}
                                            className={cn(
                                                'voice-label border px-2 py-1.5 transition-colors duration-150 ease-board',
                                                active
                                                    ? 'bg-strip text-strip-ink border-strip'
                                                    : 'text-bone-dim border-rail hover:border-bone-faint hover:text-bone'
                                            )}
                                        >
                                            {sanitizeText(tag.name)}
                                        </button>
                                    )
                                })}
                            </div>
                        </Field>
                    )}

                    <Field label="Photos" hint="Up to a handful. Resized before they upload.">
                        <PhotoUploader
                            photos={photos}
                            onAdd={handleAddPhotos}
                            onRemove={handleRemovePhoto}
                        />
                    </Field>

                    <div className="flex items-center justify-between gap-4 px-4 py-5">
                        <div>
                            <p className="voice-label text-bone-dim mb-1">Who can read it</p>
                            <p className="text-ui-sm text-bone-faint">
                                {isPublic
                                    ? 'Anyone with the link, and it shows on your profile.'
                                    : 'Only you. It still counts towards your stats.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={isPublic}
                            aria-label="Make this review public"
                            onClick={() => setValue('isPublic', !isPublic)}
                            className={cn(
                                'relative shrink-0 w-14 h-7 border transition-colors duration-150 ease-board',
                                isPublic ? 'bg-strip border-strip' : 'bg-groove border-rail-strong'
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'absolute top-[3px] w-5 h-5 transition-transform duration-150 ease-board',
                                    isPublic
                                        ? 'translate-x-[30px] bg-strip-ink'
                                        : 'translate-x-[3px] bg-bone-faint'
                                )}
                            />
                        </button>
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    {isEditing ? (
                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => setShowDeleteModal(true)}
                        >
                            Delete review
                        </Button>
                    ) : (
                        <span />
                    )}
                    <div className="flex gap-2">
                        <Link to={`/events/${eventId}`} className="btn-secondary">
                            Cancel
                        </Link>
                        <Button type="submit" isLoading={isSaving} loadingLabel="Saving your review">
                            {isEditing ? 'Save changes' : 'Post review'}
                        </Button>
                    </div>
                </div>
            </form>

            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Delete this review?"
            >
                <p className="text-ui text-bone-dim mb-5">
                    The text, score and photos go for good. The gig stays in your archive.
                </p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Keep it
                    </Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={deleteReview.isPending}
                        loadingLabel="Deleting"
                    >
                        Delete review
                    </Button>
                </div>
            </Modal>
        </div>
    )
}
