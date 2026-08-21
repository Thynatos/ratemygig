import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import {
    useNotifications,
    useUnreadNotificationCount,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
} from '../api/notifications'
import { NotificationItem } from './NotificationItem'

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const { data: unreadCount = 0 } = useUnreadNotificationCount()
    const { data: notifications = [] } = useNotifications()
    const markRead = useMarkNotificationRead()
    const markAllRead = useMarkAllNotificationsRead()

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen])

    return (
        <div ref={dropdownRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={
                    unreadCount > 0
                        ? `Notifications, ${unreadCount} unread`
                        : 'Notifications'
                }
                className="btn-icon relative"
            >
                <Bell className="w-[18px] h-[18px]" aria-hidden="true" />
                {unreadCount > 0 && (
                    <span
                        aria-hidden="true"
                        className="absolute top-1 right-1 min-w-[14px] h-[14px] px-[3px] flex items-center justify-center voice-label text-[9px] bg-strip text-strip-ink"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 w-[min(22rem,calc(100vw-2rem))] border border-rail-strong bg-board shadow-lift z-50">
                    <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-b border-rail">
                        <h2 className="voice-label text-bone-dim">Notifications</h2>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => markAllRead.mutate()}
                                className="voice-label text-strip hover:text-strip-bright"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="px-3 py-6 text-center text-ui-sm text-bone-faint">
                                Nothing to tell you yet.
                            </p>
                        ) : (
                            <div className="rail-list border-y-0">
                                {notifications.slice(0, 5).map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkRead={id => markRead.mutate(id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="border-t border-rail">
                            <Link
                                to="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="block px-3 py-2.5 voice-label text-bone-dim hover:text-strip hover:bg-board-raised transition-colors duration-150 ease-board"
                            >
                                See all notifications
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
