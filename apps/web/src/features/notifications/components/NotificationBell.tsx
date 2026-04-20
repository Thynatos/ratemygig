import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '../api/notifications'
import { NotificationItem } from './NotificationItem'

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
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

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-surface-300 hover:text-white transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface-800 border border-surface-600 rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
                        <span className="font-semibold text-white text-sm">Notifications</span>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllRead.mutate()}
                                className="text-xs text-primary-400 hover:text-primary-300"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-surface-400 text-sm">
                                No notifications yet
                            </div>
                        ) : (
                            notifications.slice(0, 5).map(notification => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkRead={(id) => markRead.mutate(id)}
                                />
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="border-t border-surface-700 px-4 py-2">
                            <Link
                                to="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="text-sm text-primary-400 hover:text-primary-300 text-center block"
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}