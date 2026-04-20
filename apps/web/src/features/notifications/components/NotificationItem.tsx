import { Calendar, Star, Users, MapPin } from 'lucide-react'
import type { Notification as NotificationType } from '@core/index'

const typeIcons: Record<string, typeof Calendar> = {
    event_reminder: Calendar,
    new_review: Star,
    artist_event: Users,
    venue_event: MapPin,
}

const typeColors: Record<string, string> = {
    event_reminder: 'text-blue-400',
    new_review: 'text-yellow-400',
    artist_event: 'text-accent-400',
    venue_event: 'text-primary-400',
}

interface NotificationItemProps {
    notification: NotificationType
    onMarkRead: (id: string) => void
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
    const Icon = typeIcons[notification.type] || Calendar
    const colorClass = typeColors[notification.type] || 'text-surface-400'
    const timeAgo = getTimeAgo(notification.created_at)

    const handleClick = () => {
        if (!notification.is_read) {
            onMarkRead(notification.id)
        }
    }

    const content = (
        <div
            className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${notification.is_read ? 'bg-transparent' : 'bg-surface-800/50 hover:bg-surface-800 cursor-pointer'}`}
            onClick={handleClick}
        >
            <div className={`mt-0.5 ${colorClass}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${notification.is_read ? 'text-surface-300' : 'text-white'}`}>
                        {notification.title}
                    </span>
                    {!notification.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
                    )}
                </div>
                {notification.body && (
                    <p className="text-xs text-surface-400 mt-0.5 line-clamp-2">{notification.body}</p>
                )}
            </div>
            <span className="text-xs text-surface-500 shrink-0">{timeAgo}</span>
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