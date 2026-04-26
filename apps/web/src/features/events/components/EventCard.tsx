import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Ticket, Users } from 'lucide-react'
import type { Event } from '@core/index'
import { formatDate } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/ui/Badge'

interface EventCardProps {
    event: Event
}

export const EventCard = memo(function EventCard({ event }: EventCardProps) {
    const eventDate = new Date(event.start_at)
    const isPast = eventDate < new Date()

    return (
        <Link to={`/events/${event.id}`} className="block">
            <article className="event-card group">
                <div className="flex gap-4">
                    {/* Date Box */}
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/30 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                            {eventDate.getDate()}
                        </span>
                        <span className="text-xs uppercase text-primary-400 font-medium">
                            {eventDate.toLocaleString('default', { month: 'short' })}
                        </span>
                    </div>

                    {/* Event Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-lg line-clamp-2 group-hover:text-primary-400 transition-colors">
                            {event.name}
                        </h3>

                        <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-surface-400">
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                    {event.venue?.name || 'TBA'} • {event.city}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-surface-400">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span>{formatDate(event.start_at, 'EEE, MMM d • h:mm a')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tags and Actions */}
                <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        {event.lineup.slice(0, 2).map((artist, i) => (
                            <Badge key={i} variant="surface">
                                <Users className="w-3 h-3 mr-1" />
                                {artist}
                            </Badge>
                        ))}
                        {event.lineup.length > 2 && (
                            <Badge variant="surface">+{event.lineup.length - 2}</Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {isPast ? (
                            <Badge variant="surface">Past</Badge>
                        ) : event.ticket_urls.length > 0 ? (
                            <span className="flex items-center gap-1 text-sm font-medium text-accent-400">
                                <Ticket className="w-4 h-4" />
                                Tickets
                            </span>
                        ) : null}
                    </div>
                </div>
            </article>
        </Link>
    )
})
