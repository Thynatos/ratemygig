import { Link } from 'react-router-dom'
import { User, Calendar, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Avatar } from '@/shared/components/ui/Avatar'
import { RatingDisplay } from '@/shared/components/ui/StarRating'
import { formatRelativeTime, formatDate } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { FeedItem, ReviewFeedItem, EventFeedItem, AttendanceFeedItem } from '../api/feed'

interface FeedCardProps {
    item: FeedItem
}

export function FeedCard({ item }: FeedCardProps) {
    switch (item.type) {
        case 'review':
            return <ReviewCard item={item} />
        case 'event':
            return <EventCard item={item} />
        case 'attendance':
            return <AttendanceCard item={item} />
    }
}

function ReviewCard({ item }: { item: ReviewFeedItem }) {
    const author = item.author
    const review = item.review

    return (
        <Card hoverable>
            <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                    {author ? (
                        <Link to={author.username ? `/u/${author.username}` : '#'}>
                            <Avatar src={author.avatar_url} name={author.display_name || 'User'} size="sm" />
                        </Link>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-surface-400" />
                        </div>
                    )}
                    <div>
                        {author?.username ? (
                            <Link to={`/u/${author.username}`} className="font-medium text-white hover:text-primary-400 transition-colors">
                                {author.display_name || author.username}
                            </Link>
                        ) : (
                            <span className="font-medium text-white">{author?.display_name || 'Anonymous'}</span>
                        )}
                        <span className="text-surface-500 mx-2">reviewed</span>
                        {item.event && (
                            <Link to={`/events/${item.event.id}`} className="font-medium text-primary-400 hover:text-primary-300">
                                {item.event.name}
                            </Link>
                        )}
                        <p className="text-xs text-surface-500">{formatRelativeTime(item.created_at)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                    <RatingDisplay rating={review.rating} />
                </div>

                {review.title && (
                    <p className="font-medium text-white mb-1">&ldquo;{sanitizeText(review.title)}&rdquo;</p>
                )}
                <p className="text-surface-300 line-clamp-2">{sanitizeText(review.body)}</p>

                <Link to={`/r/${review.id}`} className="inline-block mt-3 text-sm text-primary-400 hover:text-primary-300">
                    Read more →
                </Link>
            </CardContent>
        </Card>
    )
}

function EventCard({ item }: { item: EventFeedItem }) {
    return (
        <Card hoverable>
            <CardContent className="p-5">
                <div className="flex items-center gap-2 text-surface-400 text-sm mb-2">
                    <Calendar className="w-4 h-4 text-primary-400" />
                    <span>Upcoming event</span>
                    <span className="text-surface-500">•</span>
                    <span>{formatRelativeTime(item.created_at)}</span>
                </div>

                <Link to={`/events/${item.event.id}`} className="text-lg font-semibold text-white hover:text-primary-400 transition-colors">
                    {item.event.name}
                </Link>

                <div className="flex items-center gap-3 mt-2 text-sm text-surface-400">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.event.start_at, 'MMM d, yyyy')}
                    </span>
                    {item.venue && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {item.venue.name}, {item.venue.city}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

function AttendanceCard({ item }: { item: AttendanceFeedItem }) {
    const user = item.user

    return (
        <Card hoverable>
            <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                    {user ? (
                        <Link to={user.username ? `/u/${user.username}` : '#'}>
                            <Avatar src={user.avatar_url} name={user.display_name || 'User'} size="sm" />
                        </Link>
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center">
                            <User className="w-4 h-4 text-surface-400" />
                        </div>
                    )}
                    <div>
                        {user?.username ? (
                            <Link to={`/u/${user.username}`} className="font-medium text-white hover:text-primary-400 transition-colors">
                                {user.display_name || user.username}
                            </Link>
                        ) : (
                            <span className="font-medium text-white">{user?.display_name || 'Someone'}</span>
                        )}
                        <span className="text-surface-400"> is {item.status === 'attended' ? 'going to' : 'planning to attend'}</span>
                        <p className="text-xs text-surface-500">{formatRelativeTime(item.created_at)}</p>
                    </div>
                </div>

                {item.event && (
                    <Link to={`/events/${item.event.id}`} className="text-base font-semibold text-white hover:text-primary-400 transition-colors">
                        {item.event.name}
                    </Link>
                )}

                <div className="flex items-center gap-3 mt-2 text-sm text-surface-400">
                    {item.event && (
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.event.start_at, 'MMM d, yyyy')}
                        </span>
                    )}
                    {item.venue && (
                        <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {item.venue.name}, {item.venue.city}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}