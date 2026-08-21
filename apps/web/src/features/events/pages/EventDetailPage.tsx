import { useParams, Link } from 'react-router-dom'
import { ExternalLink, Check, Plus, Share2, ChevronLeft } from 'lucide-react'
import { parseISO, isValid, isToday, isPast as dateIsPast } from 'date-fns'
import { useEvent, useAttendance, useToggleAttendance } from '../api/events'
import { useFriendsGoing } from '../api/useFriendsGoing'
import { FriendsGoingBadge } from '../components/FriendsGoingBadge'
import { useEventReviews } from '@/features/reviews/api/reviews'
import { useEventSetlists } from '@/features/setlists/api/setlists'
import { SetlistCard } from '@/features/setlists/components/SetlistCard'
import { ReactionButtons } from '@/features/reviews/components/ReactionButtons'
import { AddToListButton } from '@/features/lists/components/AddToListButton'
import { AddToCalendarButton } from '../components/AddToCalendarButton'
import { usePhotoUrls, usePageMeta } from '@/shared/hooks'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { Avatar } from '@/shared/components/ui/Avatar'
import { LoadingPage, Skeleton } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
import {
    formatDate,
    formatRelativeTime,
    isValidUrl,
    calculateAverageRating,
} from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

/** A labelled fact on the board: micro-caps label above, bone value below. */
function Fact({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="px-4 py-3.5">
            <dt className="voice-label text-bone-faint mb-1.5">{label}</dt>
            <dd className="text-ui text-bone">{children}</dd>
        </div>
    )
}

function Section({
    title,
    count,
    action,
    children,
}: {
    title: string
    count?: number
    action?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <section>
            <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="voice-label text-bone-dim">
                    {title}
                    {count !== undefined && count > 0 && (
                        <span className="ml-2 tnum text-bone-faint">{count}</span>
                    )}
                </h2>
                {action}
            </div>
            {children}
        </section>
    )
}

export function EventDetailPage() {
    const { eventId } = useParams<{ eventId: string }>()
    const { user } = useAuth()
    const { data: event, isLoading, error } = useEvent(eventId!)
    const { data: attendance } = useAttendance(eventId!)
    const { data: friendsGoingMap } = useFriendsGoing(eventId ? [eventId] : [])
    const friendsGoing = eventId ? friendsGoingMap?.get(eventId) : undefined
    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no reviews yet" (audit finding A13).
    const {
        data: reviewsData,
        isLoading: reviewsLoading,
        isError: reviewsError,
        refetch: refetchReviews,
    } = useEventReviews(eventId!)
    const reviews = reviewsData ?? []
    const {
        data: setlistsData,
        isLoading: setlistsLoading,
        isError: setlistsError,
        refetch: refetchSetlists,
    } = useEventSetlists(eventId!)
    const setlists = setlistsData ?? []
    const toggleAttendance = useToggleAttendance()
    const allPhotoPaths = reviews.flatMap((r: { photos?: { storage_path: string }[] }) =>
        (r.photos ?? []).map((p: { storage_path: string }) => p.storage_path)
    )
    const { urls: photoUrls } = usePhotoUrls(allPhotoPaths)

    usePageMeta(
        event
            ? {
                title: event.name,
                description: `${event.name} at ${event.venue?.name || 'Venue TBA'} — ${event.city}, ${formatDate(
                    event.start_at,
                    'MMM d, yyyy'
                )}`,
                canonicalPath: `/events/${event.id}`,
            }
            : null
    )

    if (isLoading) return <LoadingPage message="Opening the night" />

    if (error || !event) {
        return (
            <div className="page page-body">
                <EmptyState
                    title="No such gig"
                    body="This listing has been removed, or the link is wrong."
                    action={
                        <Link to="/" className="btn-secondary">
                            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                            Back to what's on
                        </Link>
                    }
                />
            </div>
        )
    }

    const date = parseISO(event.start_at)
    const validDate = isValid(date)
    const isPast = validDate && dateIsPast(date)
    const tonight = validDate && isToday(date)
    const avgRating = calculateAverageRating(reviews.map(r => r.rating))
    const attended = attendance?.status === 'attended'
    const planned = attendance?.status === 'planned'

    const stripText = !validDate
        ? 'Date to be confirmed'
        : tonight
            ? `Tonight · ${formatDate(event.start_at, 'HH:mm')}`
            : `${formatDate(event.start_at, 'EEE d MMM yyyy')} · ${formatDate(event.start_at, 'HH:mm')}`

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
                text: `${sanitizeText(event.name)} at ${sanitizeText(event.venue?.name || '')}`,
                url: window.location.href,
            })
        } else {
            await navigator.clipboard.writeText(window.location.href)
        }
    }

    return (
        <div className="page page-body">
            <Link
                to="/"
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                What's on
            </Link>

            <BoardHeader
                strip={stripText}
                title={sanitizeText(event.name)}
                lede={
                    <>
                        {sanitizeText(event.venue?.name || 'Venue to be announced')} ·{' '}
                        {sanitizeText(event.city)}
                        {event.country && `, ${sanitizeText(event.country)}`}
                    </>
                }
            >
                <div className="flex flex-wrap items-center gap-2">
                    {!isPast && (
                        <Button
                            onClick={() => handleAttendance('planned')}
                            variant={planned ? 'primary' : 'secondary'}
                            isLoading={toggleAttendance.isPending}
                            loadingLabel="Saving"
                            aria-pressed={planned}
                        >
                            {planned ? (
                                <Check className="w-4 h-4" aria-hidden="true" />
                            ) : (
                                <Plus className="w-4 h-4" aria-hidden="true" />
                            )}
                            {planned ? 'Going' : 'I want to go'}
                        </Button>
                    )}

                    <Button
                        onClick={() => handleAttendance('attended')}
                        variant={attended ? 'primary' : 'secondary'}
                        isLoading={toggleAttendance.isPending}
                        loadingLabel="Saving"
                        aria-pressed={attended}
                    >
                        {attended && <Check className="w-4 h-4" aria-hidden="true" />}
                        {attended ? 'You were there' : 'I was there'}
                    </Button>

                    <AddToListButton eventId={event.id} />
                    {!isPast && <AddToCalendarButton event={event} />}

                    <Button variant="ghost" onClick={handleShare}>
                        <Share2 className="w-4 h-4" aria-hidden="true" />
                        Share
                    </Button>
                </div>

                {friendsGoing && friendsGoing.length > 0 && (
                    <p className="mt-3">
                        <FriendsGoingBadge friends={friendsGoing} />
                    </p>
                )}
            </BoardHeader>

            <div className="grid gap-8 lg:gap-10 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-10">
                    <Section
                        title="Reviews"
                        count={reviews.length}
                        action={
                            attended ? (
                                <Link to={`/review/${event.id}`} className="btn-primary">
                                    Rate the night
                                </Link>
                            ) : undefined
                        }
                    >
                        {reviews.length > 0 && (
                            <div className="flex items-center gap-3 border border-rail bg-board px-4 py-3 mb-3">
                                <span className="voice-board tnum text-board-lg text-strip leading-none">
                                    {avgRating.toFixed(1)}
                                </span>
                                <span className="flex flex-col gap-1">
                                    <ScoreStrip value={avgRating} size="sm" />
                                    <span className="voice-label text-bone-faint">
                                        Across {reviews.length}{' '}
                                        {reviews.length === 1 ? 'review' : 'reviews'}
                                    </span>
                                </span>
                            </div>
                        )}

                        {reviewsLoading ? (
                            <div className="rail-list" role="status" aria-label="Loading reviews">
                                {[1, 2].map(i => (
                                    <div key={i} className="row">
                                        <span className="row-body gap-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-3 w-3/4" />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : reviewsError ? (
                            <QueryErrorState
                                title="Couldn't load the reviews"
                                onRetry={() => refetchReviews()}
                            />
                        ) : reviews.length === 0 ? (
                            <EmptyState
                                title="Nobody's rated this night"
                                body={
                                    attended
                                        ? 'You were there. Say what it was like.'
                                        : 'Mark yourself as there and you can rate the room, the sound and the night.'
                                }
                                action={
                                    attended ? (
                                        <Link to={`/review/${event.id}`} className="btn-primary">
                                            Rate the night
                                        </Link>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <div className="rail-list">
                                {reviews.map(review => (
                                    <article key={review.id} className="row flex-col gap-3">
                                        <div className="flex items-start justify-between gap-4 w-full">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar
                                                    src={review.profile?.avatar_url}
                                                    name={review.profile?.display_name || null}
                                                    size="sm"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-ui text-bone truncate">
                                                        {review.profile?.display_name || 'A gig-goer'}
                                                    </p>
                                                    <p className="voice-label text-bone-faint">
                                                        {formatRelativeTime(review.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="voice-board tnum text-board-md text-strip leading-none">
                                                    {review.rating.toFixed(1)}
                                                </span>
                                                <ScoreStrip value={review.rating} size="sm" />
                                                <span className="sr-only">
                                                    {review.rating} out of 5
                                                </span>
                                            </div>
                                        </div>

                                        {review.title && (
                                            <p className="voice-slot text-ui text-bone">
                                                {sanitizeText(review.title)}
                                            </p>
                                        )}
                                        <p className="text-ui text-bone-dim line-clamp-3">
                                            {sanitizeText(review.body)}
                                        </p>

                                        {review.photos && review.photos.length > 0 && (
                                            <div className="flex gap-1 overflow-x-auto">
                                                {review.photos.map(
                                                    (photo: { id: string; storage_path: string }) => {
                                                        const url = photoUrls.get(photo.storage_path)
                                                        return url ? (
                                                            <Link
                                                                key={photo.id}
                                                                to={`/r/${review.id}`}
                                                                className="shrink-0"
                                                            >
                                                                <img
                                                                    src={url}
                                                                    alt={`Photo from ${review.profile?.display_name || 'this'} review`}
                                                                    width={64}
                                                                    height={64}
                                                                    className="h-16 w-16 object-cover border border-rail hover:opacity-80 transition-opacity duration-150 ease-board"
                                                                    loading="lazy"
                                                                    decoding="async"
                                                                />
                                                            </Link>
                                                        ) : null
                                                    }
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-4 w-full">
                                            <ReactionButtons reviewId={review.id} compact />
                                            <Link
                                                to={`/r/${review.id}`}
                                                className="voice-label text-bone-dim hover:text-strip"
                                            >
                                                Read it
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section
                        title="Setlists"
                        count={setlists.length}
                        action={
                            setlists.length > 0 ? (
                                <Link
                                    to={`/events/${event.id}/setlist`}
                                    className="voice-label text-bone-dim hover:text-strip"
                                >
                                    See all
                                </Link>
                            ) : undefined
                        }
                    >
                        {setlistsLoading ? (
                            <div className="rail-list" role="status" aria-label="Loading setlists">
                                {[1, 2].map(i => (
                                    <div key={i} className="row">
                                        <span className="row-body gap-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-full" />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : setlistsError ? (
                            <QueryErrorState
                                title="Couldn't load the setlists"
                                onRetry={() => refetchSetlists()}
                            />
                        ) : setlists.length === 0 ? (
                            <EmptyState
                                title="No setlist for this night"
                                body={
                                    user
                                        ? 'If you were there and remember the order, write it down.'
                                        : 'Sign in to add the songs played.'
                                }
                                action={
                                    user ? (
                                        <Link
                                            to={`/events/${event.id}/setlist`}
                                            className="btn-secondary"
                                        >
                                            Add the setlist
                                        </Link>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <div className="rail-list">
                                {setlists.slice(0, 3).map(setlist => (
                                    <SetlistCard
                                        key={setlist.id}
                                        setlist={setlist}
                                        to={`/events/${event.id}/setlist`}
                                    />
                                ))}
                            </div>
                        )}
                    </Section>
                </div>

                <div className="space-y-8">
                    <section className="border border-rail bg-board">
                        <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                            The night
                        </h2>
                        <dl className="divide-y divide-rail">
                            <Fact label="Date">
                                {validDate
                                    ? formatDate(event.start_at, 'EEEE d MMMM yyyy')
                                    : 'To be confirmed'}
                            </Fact>
                            {validDate && (
                                <Fact label="Doors / start">
                                    <span className="voice-data">
                                        {formatDate(event.start_at, 'HH:mm')}
                                    </span>
                                </Fact>
                            )}
                            {event.venue && (
                                <Fact label="Room">
                                    <Link
                                        to={`/venues/${event.venue.id}`}
                                        className="text-bone hover:text-strip underline decoration-rail-strong hover:decoration-strip"
                                    >
                                        {sanitizeText(event.venue.name)}
                                    </Link>
                                    <span className="block text-ui-sm text-bone-faint mt-0.5">
                                        {sanitizeText(event.venue.city)},{' '}
                                        {sanitizeText(event.venue.country)}
                                    </span>
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent(
                                            `${event.venue.name}, ${event.city}`
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1.5 voice-label text-bone-dim hover:text-strip"
                                    >
                                        Open in Maps
                                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                    </a>
                                </Fact>
                            )}
                            {event.lineup.length > 0 && (
                                <Fact label={event.lineup.length === 1 ? 'Playing' : 'Line-up'}>
                                    <ol className="space-y-1.5">
                                        {event.lineup.map((artist, i) => (
                                            <li key={i} className="flex items-baseline gap-2.5">
                                                <span className="voice-data text-ui-sm text-bone-faint tabular-nums">
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>
                                                <span
                                                    className={
                                                        i === 0 ? 'text-bone' : 'text-bone-dim'
                                                    }
                                                >
                                                    {sanitizeText(artist)}
                                                </span>
                                            </li>
                                        ))}
                                    </ol>
                                </Fact>
                            )}
                        </dl>
                    </section>

                    {event.ticket_urls.length > 0 && !isPast && (
                        <section className="border border-rail bg-board">
                            <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                                Tickets
                            </h2>
                            <div>
                                {event.ticket_urls.map(
                                    (ticket, i) =>
                                        isValidUrl(ticket.url) && (
                                            <a
                                                key={i}
                                                href={ticket.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-rail transition-colors duration-150 ease-board hover:bg-board-raised group"
                                            >
                                                <span className="text-ui text-bone group-hover:text-strip">
                                                    {sanitizeText(ticket.label)}
                                                </span>
                                                <ExternalLink
                                                    className="w-4 h-4 shrink-0 text-bone-faint group-hover:text-strip"
                                                    aria-hidden="true"
                                                />
                                            </a>
                                        )
                                )}
                            </div>
                            <p className="px-4 py-3 text-ui-sm text-bone-faint">
                                Sold by the sites above. We don't handle tickets or take a cut.
                            </p>
                        </section>
                    )}
                </div>
            </div>
        </div>
    )
}
