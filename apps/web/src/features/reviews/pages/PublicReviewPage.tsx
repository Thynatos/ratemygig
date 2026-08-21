import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useReview } from '../api/reviews'
import { ReactionButtons } from '../components/ReactionButtons'
import { CommentSection } from '@/features/comments/components/CommentSection'
import { usePhotoUrls, usePageMeta } from '@/shared/hooks'
import { Button } from '@/shared/components/ui/Button'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { Avatar } from '@/shared/components/ui/Avatar'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { EmptyState } from '@/shared/components/ui/Board'
import { formatDate, formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import { buildOgImageUrl } from '@/shared/lib/og'
import { env } from '@/shared/lib/env'

export function PublicReviewPage() {
    const { reviewId } = useParams<{ reviewId: string }>()
    const { data: review, isLoading, error } = useReview(reviewId!)
    const storagePaths = review?.photos?.map((p: { storage_path: string }) => p.storage_path) ?? []
    const thumbPaths =
        review?.photos?.map((p: { thumbnail_path: string | null }) => p.thumbnail_path) ?? []
    const {
        urls: photoUrls,
        thumbUrls,
        isLoading: photosLoading,
    } = usePhotoUrls(storagePaths, thumbPaths)

    const isPublicReview = !!review && review.is_public && review.status !== 'draft'
    usePageMeta(
        isPublicReview && reviewId
            ? {
                title: review.event?.name
                    ? `Review of ${review.event.name}`
                    : review.title || 'Review',
                description: `${review.profile?.display_name || 'Anonymous'} rated ${review.event?.name || review.title || 'an event'
                    } ${review.rating}/5`,
                canonicalPath: `/r/${reviewId}`,
                ogImage: buildOgImageUrl(env.SUPABASE_URL, reviewId),
            }
            : null
    )

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: review?.event?.name
                    ? `Review of ${review.event.name}`
                    : 'ratemygig review',
                url: window.location.href,
            })
        } else {
            await navigator.clipboard.writeText(window.location.href)
        }
    }

    if (isLoading) return <LoadingPage message="Opening the review" />

    if (error || !review || !review.is_public || review.status === 'draft') {
        return (
            <div className="page page-body">
                <EmptyState
                    title="This review isn't public"
                    body="It's been made private, deleted, or the link is wrong."
                    action={
                        <Link to="/" className="btn-secondary">
                            See what's on
                        </Link>
                    }
                />
            </div>
        )
    }

    const event = review.event
    const profile = review.profile
    const authorName = sanitizeText(profile?.display_name || profile?.username || 'A gig-goer')

    return (
        <div className="page page-body max-w-3xl">
            <Link
                to={event ? `/events/${event.id}` : '/'}
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                {event ? 'Back to the gig' : "What's on"}
            </Link>

            <article>
                {/* The night this review is about, on its own rail. */}
                {event && (
                    <div className="border-y border-rail-strong bg-board px-4 py-3.5 mb-6">
                        <Link
                            to={`/events/${event.id}`}
                            className="voice-slot text-board-md text-bone hover:text-strip"
                        >
                            {sanitizeText(event.name)}
                        </Link>
                        <p className="row-meta mt-1">
                            {formatDate(event.start_at, 'EEE d MMM yyyy')} ·{' '}
                            {sanitizeText(event.venue?.name || 'Venue unknown')} ·{' '}
                            {sanitizeText(event.city)}
                        </p>
                    </div>
                )}

                {/* The score is the headline fact. */}
                <div className="flex items-end gap-4 mb-6">
                    <span className="voice-board tnum text-strip leading-[0.8] text-[clamp(3.5rem,14vw,6rem)]">
                        {review.rating}
                    </span>
                    <span className="flex flex-col gap-2 pb-2">
                        <ScoreStrip value={review.rating} size="md" />
                        <span className="voice-label text-bone-faint">Out of five</span>
                    </span>
                </div>

                {review.title && (
                    <h1 className="voice-board text-board-lg text-bone mb-4 text-balance">
                        {sanitizeText(review.title)}
                    </h1>
                )}

                <p className="voice-read text-bone-mid whitespace-pre-wrap">
                    {sanitizeText(review.body)}
                </p>

                {review.photos && review.photos.length > 0 && (
                    <div className="photo-grid mt-8">
                        {review.photos.map(
                            (photo: {
                                id: string
                                storage_path: string
                                thumbnail_path: string | null
                            }) => {
                                const thumbUrl = photo.thumbnail_path
                                    ? thumbUrls.get(photo.thumbnail_path)
                                    : null
                                const fullUrl = photoUrls.get(photo.storage_path)
                                const displayUrl = thumbUrl || fullUrl
                                return (
                                    <div key={photo.id} className="photo-item">
                                        {photosLoading || !displayUrl ? (
                                            <div className="skeleton w-full h-full" />
                                        ) : (
                                            <img
                                                src={displayUrl}
                                                alt={`Photo from ${authorName}'s review${event ? ` of ${sanitizeText(event.name)}` : ''}`}
                                                width={300}
                                                height={300}
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        )}
                                    </div>
                                )
                            }
                        )}
                    </div>
                )}

                {/* Who wrote it, and what you can do about it. */}
                <footer className="mt-8 border-t border-rail-strong pt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        {profile?.is_profile_public && profile.username ? (
                            <Link
                                to={`/u/${profile.username}`}
                                className="flex items-center gap-2.5 group"
                            >
                                <Avatar src={profile.avatar_url} name={authorName} size="md" />
                                <span>
                                    <span className="block text-ui text-bone group-hover:text-strip">
                                        {authorName}
                                    </span>
                                    <span className="block voice-label text-bone-faint">
                                        {formatRelativeTime(review.created_at)}
                                    </span>
                                </span>
                            </Link>
                        ) : (
                            <>
                                <Avatar src={profile?.avatar_url} name={authorName} size="md" />
                                <span>
                                    <span className="block text-ui text-bone">{authorName}</span>
                                    <span className="block voice-label text-bone-faint">
                                        {formatRelativeTime(review.created_at)}
                                    </span>
                                </span>
                            </>
                        )}
                    </div>

                    <Button variant="secondary" size="sm" onClick={handleShare}>
                        Share
                    </Button>
                </footer>

                <div className="mt-4">
                    <ReactionButtons reviewId={review.id} />
                </div>

                <CommentSection reviewId={review.id} />
            </article>

            {event && (
                <p className="mt-10 pt-5 border-t border-rail">
                    <Link
                        to={`/events/${event.id}`}
                        className="voice-label text-bone-dim hover:text-strip"
                    >
                        Every review of this night
                    </Link>
                </p>
            )}
        </div>
    )
}
