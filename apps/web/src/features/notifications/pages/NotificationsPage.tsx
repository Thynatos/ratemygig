import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications, useMarkAllNotificationsRead } from '../api/notifications'
import { NotificationItem } from '../components/NotificationItem'
import { Button } from '@/shared/components/ui/Button'
import { LoadingPage } from '@/shared/components/ui/Loading'

export function NotificationsPage() {
    const { data: notifications = [], isLoading } = useNotifications()
    const markAllRead = useMarkAllNotificationsRead()

    const hasUnread = notifications.some(n => !n.is_read)

    const grouped = groupByDate(notifications)

    if (isLoading) return <LoadingPage message="Loading notifications..." />

    return (
        <div className="page-container">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                    <Bell className="w-6 h-6 text-primary-400" />
                    Notifications
                </h1>
                {hasUnread && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllRead.mutate()}
                        isLoading={markAllRead.isPending}
                    >
                        <CheckCheck className="w-4 h-4 mr-2" />
                        Mark all read
                    </Button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Bell className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <p className="text-surface-400">No notifications yet</p>
                    <p className="text-surface-500 text-sm mt-2">
                        We'll notify you about events from followed artists and venues.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {grouped.map(group => (
                        <div key={group.label}>
                            <h2 className="text-sm font-medium text-surface-400 uppercase tracking-wider mb-2">
                                {group.label}
                            </h2>
                            <div className="glass-card divide-y divide-surface-700">
                                {group.items.map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkRead={() => {}}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function groupByDate(notifications: { created_at: string; [key: string]: unknown }[]) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const thisWeek = new Date(today.getTime() - 7 * 86400000)

    const groups: { label: string; items: typeof notifications }[] = [
        { label: 'Today', items: [] },
        { label: 'Yesterday', items: [] },
        { label: 'This Week', items: [] },
        { label: 'Older', items: [] },
    ]

    for (const n of notifications) {
        const d = new Date(n.created_at)
        if (d >= today) groups[0].items.push(n)
        else if (d >= yesterday) groups[1].items.push(n)
        else if (d >= thisWeek) groups[2].items.push(n)
        else groups[3].items.push(n)
    }

    return groups.filter(g => g.items.length > 0)
}