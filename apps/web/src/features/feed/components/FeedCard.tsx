import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/shared/components/ui/Avatar'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { DateSlot } from '@/shared/components/ui/Board'
import { formatRelativeTime, formatDate } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { FeedItem, ReviewFeedItem, EventFeedItem, AttendanceFeedItem } from '../api/feed'

interface FeedCardProps {
    item: FeedItem
}

/**
 * Feed rows. The person is the identity of a social row, so the avatar takes
 * the left slot; an announcement with no person takes the date instead.
 */
export const FeedCard = memo(function FeedCard({ item }: FeedCardProps) {
    switch (item.type) {
        case 'review':
            return <ReviewRow item={item} />
        case 'event':
            return <EventRow item={item} />
        case 'attendance':
            return <AttendanceRow item={item} />
    }
})

function PersonLink({
    person,
}: {
    person?: { username?: string | null; display_name?: string | null } | null
}) {
    const name = sanitizeText(person?.display_name || person?.username || 'Someone')
    if (person?.username) {
        return (
            <Link to={`/u/${person.username}`} className="text-bone hover:text-strip">
                {name}
            </Link>
        )
    }
    return <span className="text-bone">{name}</span>
}

function ReviewRow({ item }: { item: ReviewFeedItem }) {
    const author = item.author
    const review = item.review

    return (
        <article className="row items-start">
            <span className="row-slot !w-11 sm:!w-14">
                <Avatar
                    src={author?.avatar_url}
                    name={author?.display_name || author?.username || null}
                    size="md"
                />
            </span>

            <span className="row-body">
                <span className="text-ui text-bone-dim">
                    <PersonLink person={author} /> rated{' '}
                    {item.event && (
                        <Link
                            to={`/events/${item.event.id}`}
                            className="text-bone hover:text-strip"
                        >
                            {sanitizeText(item.event.name)}
                        </Link>
                    )}
                </span>

                <span className="flex items-center gap-2 my-1">
                    <span className="voice-board tnum text-board-md text-strip leading-none">
                        {review.rating.toFixed(1)}
                    </span>
                    <ScoreStrip value={review.rating} size="sm" />
                    <span className="sr-only">{review.rating} out of 5</span>
                </span>

                {review.title && (
                    <span className="voice-slot text-ui text-bone">
                        {sanitizeText(review.title)}
                    </span>
                )}
                <span className="text-ui text-bone-dim line-clamp-2">
                    {sanitizeText(review.body)}
                </span>

                <Link
                    to={`/r/${review.id}`}
                    className="voice-label text-bone-dim hover:text-strip mt-1"
                >
                    Read it
                </Link>
            </span>

            <span className="row-end">
                <span className="voice-label text-bone-faint">
                    {formatRelativeTime(item.created_at)}
                </span>
            </span>
        </article>
    )
}

function EventRow({ item }: { item: EventFeedItem }) {
    return (
        <article className="row items-start">
            <span className="row-slot">
                <DateSlot date={item.event.start_at} />
            </span>

            <span className="row-body">
                <span className="voice-label text-strip">New date announced</span>
                <Link
                    to={`/events/${item.event.id}`}
                    className="row-title hover:text-strip"
                >
                    {sanitizeText(item.event.name)}
                </Link>
                {item.venue && (
                    <span className="row-meta">
                        {sanitizeText(item.venue.name)} · {sanitizeText(item.venue.city)}
                    </span>
                )}
            </span>

            <span className="row-end">
                <span className="voice-label text-bone-faint">
                    {formatRelativeTime(item.created_at)}
                </span>
            </span>
        </article>
    )
}

function AttendanceRow({ item }: { item: AttendanceFeedItem }) {
    const user = item.user
    // 'attended' is past tense; 'planned' is future. The original copy had
    // these the wrong way round.
    const verb = item.status === 'attended' ? 'was at' : 'is going to'

    return (
        <article className="row items-start">
            <span className="row-slot !w-11 sm:!w-14">
                <Avatar
                    src={user?.avatar_url}
                    name={user?.display_name || user?.username || null}
                    size="md"
                />
            </span>

            <span className="row-body">
                <span className="text-ui text-bone-dim">
                    <PersonLink person={user} /> {verb}{' '}
                    {item.event && (
                        <Link
                            to={`/events/${item.event.id}`}
                            className="text-bone hover:text-strip"
                        >
                            {sanitizeText(item.event.name)}
                        </Link>
                    )}
                </span>

                <span className="row-meta">
                    {item.event && formatDate(item.event.start_at, 'EEE d MMM yyyy')}
                    {item.venue &&
                        ` · ${sanitizeText(item.venue.name)}, ${sanitizeText(item.venue.city)}`}
                </span>
            </span>

            <span className="row-end">
                <span className="voice-label text-bone-faint">
                    {formatRelativeTime(item.created_at)}
                </span>
            </span>
        </article>
    )
}
