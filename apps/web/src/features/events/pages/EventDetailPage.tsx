import { useParams, Link } from 'react-router-dom'
import {
    Calendar, MapPin, ExternalLink, Ticket, Users, Heart,
    Check, Plus, Share2, Star, ChevronLeft, Music
} from 'lucide-react'
import { useEvent, useAttendance, useToggleAttendance } from '../api/events'
import { useEventReviews } from '@/features/reviews/api/reviews'
import { useEventSetlists } from '@/features/setlists/api/setlists'
import { SetlistCard } from '@/features/setlists/components/SetlistCard'
import { ReactionButtons } from '@/features/reviews/components/ReactionButtons'
import { usePhotoUrls } from '@/shared/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { RatingDisplay } from '@/shared/components/ui/StarRating'
import { Avatar } from '@/shared/components/ui/Avatar'
import { LoadingPage, Skeleton } from '@/shared/components/ui/Loading'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { formatDate, formatRelativeTime, isValidUrl, calculateAverageRating } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

export function EventDetailPage() {
    const { eventId } = useParams<{ eventId: string }>()
    const { user } = useAuth()
    const { data: event, isLoading, error } = useEvent(eventId!)
    const { data: attendance } = useAttendance(eventId!)
    const { data: reviews = [], isLoading: reviewsLoading } = useEventReviews(eventId!)
    const { data: setlists = [], isLoading: setlistsLoading } = useEventSetlists(eventId!)
    const toggleAttendance = useToggleAttendance()
    const allPhotoPaths = reviews.flatMap((r: { photos?: { storage_path: string }[] }) =>
        (r.photos ?? []).map((p: { storage_path: string }) => p.storage_path)
    )
    const { urls: photoUrls } = usePhotoUrls(allPhotoPaths)

    if (isLoading) return <LoadingPage message="Loading event details..." />

    if (error || !event) {
        return (
            <div className="page-container">
                <div className="glass-card p-12 text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">Event not found</h2>
                    <p className="text-surface-400 mb-6">This event may have been removed or doesn't exist.</p>
                    <Link to="/">
                        <Button variant="secondary">
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back to Events
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    const eventDate = new Date(event.start_at)
    const isPast = eventDate < new Date()
    const avgRating = calculateAverageRating(reviews.map(r => r.rating))

    const handleAttendance = (status: 'planned' | 'attended') => {
        if (!user) {
            window.location.href = '/login'
            return
        }
        toggleAttendance.mutate({ eventId: event.id, status })
    }

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({
                title: event.name,
                text: `Check out ${event.name} at ${event.venue?.name}`,
                url: window.location.href,
            })
        } else {
            await navigator.clipboard.writeText(window.location.href)
            alert('Link copied to clipboard!')
        }
    }

    return (
        <div className="page-container">
            {/* Back Button */}
            <Link
                to="/"
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                Back to Events
            </Link>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Event Header */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {isPast && <Badge variant="surface">Past Event</Badge>}
                                {event.lineup.map((artist, i) => (
                                    <Badge key={i} variant="primary">
                                        <Users className="w-3 h-3 mr-1" />
                                        {artist}
                                    </Badge>
                                ))}
                            </div>

                            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                                {event.name}
                            </h1>

                            <div className="space-y-3 text-surface-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white">
                                            {formatDate(event.start_at, 'EEEE, MMMM d, yyyy')}
                                        </div>
                                        <div className="text-sm text-surface-400">
                                            {formatDate(event.start_at, 'h:mm a')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-accent-400" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-white">
                                            {event.venue?.name || 'Venue TBA'}
                                        </div>
                                        <div className="text-sm text-surface-400">
                                            {event.city}, {event.country}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Venue Map Link */}
                            {event.venue && (
                                <a
                                    href={`https://maps.google.com/?q=${encodeURIComponent(
                                        `${event.venue.name}, ${event.city}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-4 inline-flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View on Google Maps
                                </a>
                            )}

                            {/* Actions */}
                            <div className="mt-6 flex flex-wrap gap-3">
                                {!isPast && (
                                    <>
                                        <Button
                                            onClick={() => handleAttendance('planned')}
                                            variant={attendance?.status === 'planned' ? 'primary' : 'secondary'}
                                            isLoading={toggleAttendance.isPending}
                                        >
                                            {attendance?.status === 'planned' ? (
                                                <Check className="w-4 h-4 mr-2" />
                                            ) : (
                                                <Plus className="w-4 h-4 mr-2" />
                                            )}
                                            {attendance?.status === 'planned' ? 'Going' : 'I want to go'}
                                        </Button>
                                    </>
                                )}

                                <Button
                                    onClick={() => handleAttendance('attended')}
                                    variant={attendance?.status === 'attended' ? 'primary' : 'secondary'}
                                    isLoading={toggleAttendance.isPending}
                                >
                                    {attendance?.status === 'attended' ? (
                                        <Check className="w-4 h-4 mr-2" />
                                    ) : (
                                        <Heart className="w-4 h-4 mr-2" />
                                    )}
                                    {attendance?.status === 'attended' ? 'I was there' : 'Mark as attended'}
                                </Button>

                                <Button variant="ghost" onClick={handleShare}>
                                    <Share2 className="w-4 h-4 mr-2" />
                                    Share
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reviews Section */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <Star className="w-5 h-5 text-yellow-400" />
                                        Reviews
                                    </h2>
                                    {reviews.length > 0 && (
                                        <Badge variant="surface">
                                            {avgRating.toFixed(1)} avg • {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                                        </Badge>
                                    )}
                                </div>
                                {attendance?.status === 'attended' && (
                                    <Link to={`/review/${event.id}`}>
                                        <Button size="sm">Write a Review</Button>
                                    </Link>
                                )}
                            </div>

                            {reviewsLoading ? (
                                <div className="space-y-4">
                                    {[1, 2].map(i => (
                                        <div key={i} className="p-4 rounded-xl bg-surface-800/50">
                                            <Skeleton className="h-4 w-32 mb-2" />
                                            <Skeleton className="h-3 w-full mb-1" />
                                            <Skeleton className="h-3 w-3/4" />
                                        </div>
                                    ))}
                                </div>
                            ) : reviews.length === 0 ? (
                                <div className="text-center py-8">
                                    <Star className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                                    <p className="text-surface-400 mb-4">
                                        No reviews yet. Be the first to share your experience!
                                    </p>
                                    {attendance?.status === 'attended' ? (
                                        <Link to={`/review/${event.id}`}>
                                            <Button variant="secondary">Write a Review</Button>
                                        </Link>
                                    ) : (
                                        <p className="text-sm text-surface-500">
                                            Mark this event as attended to leave a review
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {reviews.map(review => (
                                        <div key={review.id} className="p-4 rounded-xl bg-surface-800/50 border border-surface-700">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar
                                                        src={review.profile?.avatar_url}
                                                        name={review.profile?.display_name || 'User'}
                                                        size="sm"
                                                    />
                                                    <div>
                                                        <div className="font-medium text-white">
                                                            {review.profile?.display_name || 'Anonymous'}
                                                        </div>
                                                        <div className="text-sm text-surface-500">
                                                            {formatRelativeTime(review.created_at)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <RatingDisplay rating={review.rating} />
                                            </div>

                                            {review.title && (
                                                <p className="mt-3 font-medium text-white">&ldquo;{sanitizeText(review.title)}&rdquo;</p>
                                            )}
                                            <p className="mt-2 text-surface-300 line-clamp-3">{sanitizeText(review.body)}</p>

                                            {review.photos && review.photos.length > 0 && (
                                                <div className="mt-3 flex gap-2 overflow-x-auto">
                                                    {review.photos.map((photo: { id: string; storage_path: string }) => {
                                                        const url = photoUrls.get(photo.storage_path)
                                                        return url ? (
                                                            <Link key={photo.id} to={`/r/${review.id}`} className="shrink-0">
                                                                <img
                                                                    src={url}
                                                                    alt="Review photo"
                                                                    className="h-16 w-16 rounded-lg object-cover hover:opacity-80 transition-opacity"
                                                                    loading="lazy"
                                                                />
                                                            </Link>
                                                        ) : null
                                                    })}
                                                </div>
                                            )}

                                            <div className="mt-3">
                                                <Link
                                                    to={`/r/${review.id}`}
                                                    className="text-sm text-primary-400 hover:text-primary-300"
                                                >
                                                    Read more →
                                                </Link>
                                            </div>

                                            <div className="mt-3">
                                                <ReactionButtons reviewId={review.id} compact />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Setlists Section */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                        <Music className="w-5 h-5 text-primary-400" />
                                        Setlists
                                    </h2>
                                    {setlists.length > 0 && (
                                        <Badge variant="surface">{setlists.length}</Badge>
                                    )}
                                </div>
                                <Link to={`/events/${event.id}/setlist`}>
                                    {setlists.length > 0 && (
                                        <Button variant="ghost" size="sm">View All</Button>
                                    )}
                                </Link>
                            </div>

                            {setlistsLoading ? (
                                <div className="space-y-3">
                                    {[1, 2].map(i => (
                                        <div key={i} className="p-4 rounded-xl bg-surface-800/50">
                                            <Skeleton className="h-4 w-32 mb-2" />
                                            <Skeleton className="h-3 w-full" />
                                        </div>
                                    ))}
                                </div>
                            ) : setlists.length === 0 ? (
                                <div className="text-center py-8">
                                    <Music className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                                    <p className="text-surface-400 mb-4">No setlists yet for this event.</p>
                                    {user && (
                                        <Link to={`/events/${event.id}/setlist`}>
                                            <Button variant="secondary" size="sm">Add a Setlist</Button>
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {setlists.slice(0, 3).map(setlist => (
                                        <Link key={setlist.id} to={`/events/${event.id}/setlist`}>
                                            <SetlistCard setlist={setlist} onClick={() => {}} />
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Ticket Links */}
                    {event.ticket_urls.length > 0 && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Ticket className="w-5 h-5 text-accent-400" />
                                    Get Tickets
                                </h3>
                                <div className="space-y-3">
                                    {event.ticket_urls.map((ticket, i) => (
                                        isValidUrl(ticket.url) && (
                                            <a
                                                key={i}
                                                href={ticket.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-surface-700 hover:border-accent-500/50 hover:bg-surface-700 transition-all group"
                                            >
                                                <span className="font-medium text-white group-hover:text-accent-400">
                                                    {ticket.label}
                                                </span>
                                                <ExternalLink className="w-4 h-4 text-surface-400 group-hover:text-accent-400" />
                                            </a>
                                        )
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Venue Info */}
                    {event.venue && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary-400" />
                                    Venue
                                </h3>
                                <Link
                                    to={`/venues/${event.venue.id}`}
                                    className="block hover:bg-surface-800 -mx-2 px-2 py-2 rounded-lg transition-colors"
                                >
                                    <div className="font-medium text-white">{event.venue.name}</div>
                                    <div className="text-sm text-surface-400">
                                        {event.venue.city}, {event.venue.country}
                                    </div>
                                </Link>
                            </CardContent>
                        </Card>
                    )}

                    {/* Lineup */}
                    {event.lineup.length > 0 && (
                        <Card>
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-accent-400" />
                                    Lineup
                                </h3>
                                <div className="space-y-2">
                                    {event.lineup.map((artist, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-800 transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center text-sm font-semibold text-white">
                                                {i + 1}
                                            </div>
                                            <span className="text-white">{artist}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
