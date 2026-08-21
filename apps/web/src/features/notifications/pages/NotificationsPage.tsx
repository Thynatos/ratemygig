import { useNotifications, useMarkAllNotificationsRead } from '../api/notifications'
import { NotificationItem } from '../components/NotificationItem'
import { Button } from '@/shared/components/ui/Button'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'

export function NotificationsPage() {
    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no notifications yet" (audit finding A13).
    const { data: notificationsData, isLoading, isError, refetch } = useNotifications()
    const notifications = notificationsData ?? []
    const markAllRead = useMarkAllNotificationsRead()

    const unreadCount = notifications.filter(n => !n.is_read).length
    const grouped = groupByDate(notifications)

    if (isLoading) return <LoadingPage message="Checking for news" />

    return (
        <div className="page page-body max-w-3xl">
            <BoardHeader
                strip={
                    unreadCount > 0
                        ? `${unreadCount} unread`
                        : notifications.length > 0
                            ? 'All caught up'
                            : undefined
                }
                title="Notifications"
                lede="New dates from artists and rooms you follow, and replies to what you've written."
                action={
                    unreadCount > 0 ? (
                        <Button
                            variant="secondary"
                            onClick={() => markAllRead.mutate()}
                            isLoading={markAllRead.isPending}
                            loadingLabel="Marking everything read"
                        >
                            Mark all read
                        </Button>
                    ) : undefined
                }
            />

            {isError ? (
                <QueryErrorState
                    title="Couldn't load your notifications"
                    onRetry={() => refetch()}
                />
            ) : notifications.length === 0 ? (
                <EmptyState
                    title="Nothing to tell you"
                    body="Follow an artist or a venue and their new dates land here. Replies to your reviews do too."
                />
            ) : (
                <div className="space-y-8">
                    {grouped.map(group => (
                        <section key={group.label}>
                            <h2 className="voice-label text-bone-dim mb-3">{group.label}</h2>
                            <div className="rail-list">
                                {group.items.map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkRead={() => { }}
                                    />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </div>
    )
}

function groupByDate<T extends { created_at: string }>(notifications: T[]) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const thisWeek = new Date(today.getTime() - 7 * 86400000)

    const groups: { label: string; items: T[] }[] = [
        { label: 'Today', items: [] },
        { label: 'Yesterday', items: [] },
        { label: 'Earlier this week', items: [] },
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
