import { Calendar, Star, Users, MapPin, MessageCircle, Heart, Ticket } from 'lucide-react'
import { sanitizeText } from '@/shared/lib/sanitize'
import { cn } from '@/shared/lib/utils'
import type { Notification as NotificationType } from '@core/index'

const typeIcons: Record<string, typeof Calendar> = {
    event_reminder: Calendar,
    new_review: Star,
    artist_event: Users,
    venue_event: MapPin,
    new_comment: MessageCircle,
    review_reaction: Heart,
    friend_attendance: Ticket,
}

interface NotificationItemProps {
    notification: NotificationType
    onMarkRead: (id: string) => void
}

/**
 * Unread is a printed mark, not a colour wash: an amber rail-cap in the left
 * gutter and bone text. Read rows drop to the dim ramp and lose the cap.
 */
export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
    const Icon = typeIcons[notification.type] || Calendar
    const timeAgo = getTimeAgo(notification.created_at)
    const unread = !notification.is_read

    const handleClick = () => {
        if (unread) {
            onMarkRead(notification.id)
        }
    }

    const content = (
        <div
            className={cn('row items-start', unread && 'row-current row-interactive')}
            onClick={handleClick}
        >
            <span className="row-slot !w-8">
                <Icon
                    className={cn('w-[18px] h-[18px]', unread ? 'text-strip' : 'text-bone-faint')}
                    aria-hidden="true"
                />
            </span>

            <span className="row-body">
                <span className={cn('text-ui', unread ? 'text-bone' : 'text-bone-dim')}>
                    {sanitizeText(notification.title)}
                </span>
                {notification.body && (
                    <span className="text-ui-sm text-bone-faint line-clamp-2">
                        {sanitizeText(notification.body)}
                    </span>
                )}
                {unread && <span className="sr-only">Unread</span>}
            </span>

            <span className="row-end">
                <span className="voice-label text-bone-faint whitespace-nowrap">{timeAgo}</span>
            </span>
        </div>
    )

    if (notification.link) {
        return (
            <a href={notification.link} onClick={handleClick} className="block">
                {content}
            </a>
        )
    }

    return content
}

function getTimeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return `${Math.floor(days / 7)}w ago`
}
