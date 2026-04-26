import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Share2, ChevronLeft } from 'lucide-react'
import { useReview } from '../api/reviews'
import { ReactionButtons } from '../components/ReactionButtons'
import { CommentSection } from '@/features/comments/components/CommentSection'
import { usePhotoUrls } from '@/shared/hooks'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { StarRating } from '@/shared/components/ui/StarRating'
import { Avatar } from '@/shared/components/ui/Avatar'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { formatDate, formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

export function PublicReviewPage() {
    const { reviewId } = useParams<{ reviewId: string }>()
    const { data: review, isLoading, error } = useReview(reviewId!)
    const storagePaths = review?.photos?.map((p: { storage_path: string }) => p.storage_path) ?? []
    const { urls: photoUrls, isLoading: photosLoading } = usePhotoUrls(storagePaths)

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: review?.event?.name ? `Review of ${review.event.name}` : 'ratemygig Review',
                url: window.location.href,
            })
        } else {
            await navigator.clipboard.writeText(window.location.href)
            alert('Link copied to clipboard!')
        }
    }

    if (isLoading) return <LoadingPage message="Loading review..." />

    if (error || !review || !review.is_public || review.status === 'draft') {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <h2 className="text-xl font-semibold text-white mb-2">Review not found</h2>
                        <p className="text-surface-400 mb-6">
                            This review may be private or has been deleted.
                        </p>
                        <Link to="/">
                            <Button variant="secondary">Discover Events</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const event = review.event
    const profile = review.profile

    return (
        <div className="page-container max-w-3xl mx-auto">
            {/* Back */}
            <Link
                to={event ? `/events/${event.id}` : '/'}
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                {event ? 'Back to Event' : 'Discover Events'}
            </Link>

            <Card>
                <CardContent className="p-6 md:p-8">
                    {/* Event Info */}
                    {event && (
                        <div className="mb-6 p-4 rounded-xl bg-surface-800/50 border border-surface-700">
                            <Link
                                to={`/events/${event.id}`}
                                className="font-semibold text-lg text-white hover:text-primary-400 transition-colors"
                            >
                                {sanitizeText(event.name)}
                            </Link>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-surface-400">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {formatDate(event.start_at, 'MMM d, yyyy')}
                                </span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {sanitizeText(event.venue?.name)}, {sanitizeText(event.city)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Rating */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="text-center">
                            <div className="text-5xl font-bold text-white mb-2">{review.rating}</div>
                            <StarRating value={review.rating} readonly size="lg" />
                        </div>
                    </div>

                    {/* Review Title */}
                    {review.title && (
                        <h1 className="text-2xl font-display font-bold text-white text-center mb-4">
                            &ldquo;{sanitizeText(review.title)}&rdquo;
                        </h1>
                    )}

                    {/* Review Body */}
                    <div className="prose prose-invert max-w-none mb-6">
                        <p className="text-surface-200 text-lg leading-relaxed whitespace-pre-wrap">
                            {sanitizeText(review.body)}
                        </p>
                    </div>

                    {/* Photos */}
                    {review.photos && review.photos.length > 0 && (
                        <div className="mb-6">
                            <div className="photo-grid">
                                {review.photos.map((photo: { id: string; storage_path: string }) => {
                                    const url = photoUrls.get(photo.storage_path)
                                    return (
                                        <div key={photo.id} className="photo-item">
                                            {photosLoading || !url ? (
                                                <div className="w-full h-full bg-surface-700 animate-pulse" />
                                            ) : (
                                                <img
                                                    src={url}
                                                    alt="Review photo"
                                                    className="w-full h-full object-cover rounded-lg"
                                                    loading="lazy"
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Reactions */}
                    <div className="mt-6 pt-4 border-t border-surface-700">
                        <ReactionButtons reviewId={review.id} />
                    </div>

                    {/* Comments */}
                    <CommentSection reviewId={review.id} />

                    {/* Author */}
                    <div className="flex items-center justify-between pt-6 border-t border-surface-700">
                        <div className="flex items-center gap-3">
                            {profile?.is_profile_public ? (
                                <Link to={`/u/${profile.username}`}>
                                    <Avatar
                                        src={profile.avatar_url}
                                        name={sanitizeText(profile.display_name)}
                                        size="md"
                                    />
                                </Link>
                            ) : (
                                <Avatar
                                    src={profile?.avatar_url}
                                        name={sanitizeText(profile?.display_name || '')}
                                    size="md"
                                />
                            )}
                            <div>
                                {profile?.is_profile_public && profile.username ? (
                                    <Link
                                        to={`/u/${profile.username}`}
                                        className="font-medium text-white hover:text-primary-400 transition-colors"
                                    >
                                        {sanitizeText(profile.display_name || profile.username)}
                                    </Link>
                                ) : (
                                    <span className="font-medium text-white">
                                        {sanitizeText(profile?.display_name || 'Anonymous')}
                                    </span>
                                )}
                                <p className="text-sm text-surface-500">
                                    {formatRelativeTime(review.created_at)}
                                </p>
                            </div>
                        </div>

                        <Button variant="secondary" size="sm" onClick={handleShare}>
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* More from this event */}
            {event && (
                <div className="mt-8 text-center">
                    <Link to={`/events/${event.id}`}>
                        <Button variant="ghost">
                            See all reviews for this event
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
