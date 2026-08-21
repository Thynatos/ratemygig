import { memo } from 'react'
import { Link } from 'react-router-dom'
import { parseISO, isValid, isToday, isPast as dateIsPast } from 'date-fns'
import type { Event } from '@core/index'
import { sanitizeText } from '@/shared/lib/sanitize'
import { DateSlot } from '@/shared/components/ui/Board'
import { FriendsGoingBadge } from './FriendsGoingBadge'
import type { FriendGoing } from '../api/useFriendsGoing'

interface EventCardProps {
    event: Event
    friendsGoing?: FriendGoing[]
}

function timeLabel(startAt: string): string | null {
    const d = parseISO(startAt)
    if (!isValid(d)) return null
    return d
        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        .replace(/^24:/, '00:')
}

/**
 * An event on the board: date slot · name + room + support · state slot.
 * Named EventCard for continuity; it has not been a card since THE BOARD.
 */
export const EventCard = memo(function EventCard({ event, friendsGoing }: EventCardProps) {
    const date = parseISO(event.start_at)
    const valid = isValid(date)
    const past = valid && dateIsPast(date)
    const tonight = valid && isToday(date)
    const time = timeLabel(event.start_at)

    const support = event.lineup.slice(1)
    const venue = event.venue?.name ? sanitizeText(event.venue.name) : 'Venue to be announced'

    return (
        <Link
            to={`/events/${event.id}`}
            className={`row row-interactive${tonight ? ' row-current' : ''}`}
        >
            <span className="row-slot">
                <DateSlot date={event.start_at} />
            </span>

            <span className="row-body">
                <span className="row-title line-clamp-2">{sanitizeText(event.name)}</span>

                <span className="row-meta">
                    {venue} · {sanitizeText(event.city)}
                </span>

                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ui-sm text-bone-faint">
                    {time && <span className="voice-data">{time}</span>}
                    {support.length > 0 && (
                        <span className="truncate">
                            with {support.slice(0, 2).map(sanitizeText).join(', ')}
                            {support.length > 2 && ` +${support.length - 2}`}
                        </span>
                    )}
                </span>

                {friendsGoing && friendsGoing.length > 0 && (
                    <span className="mt-1 block">
                        <FriendsGoingBadge friends={friendsGoing} />
                    </span>
                )}
            </span>

            <span className="row-end">
                {past ? (
                    <span className="voice-label text-bone-faint">Past</span>
                ) : tonight ? (
                    <span className="strip">Tonight</span>
                ) : event.ticket_urls.length > 0 ? (
                    <span className="voice-label text-bone-dim">Tickets</span>
                ) : null}
            </span>
        </Link>
    )
})
