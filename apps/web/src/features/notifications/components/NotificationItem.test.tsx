import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NotificationItem } from './NotificationItem'
import type { Notification } from '@core/index'

function makeNotification(overrides: Partial<Notification>): Notification {
    return {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'artist_event',
        title: 'New event from Radiohead',
        body: 'Radiohead Live · London',
        link: '/events/evt-1',
        is_read: false,
        created_at: new Date().toISOString(),
        ...overrides,
    }
}

describe('NotificationItem', () => {
    it('renders new_comment with icon, copy and link', () => {
        const { container } = render(
            <NotificationItem
                notification={makeNotification({
                    type: 'new_comment',
                    title: 'Jane Doe commented on your review',
                    body: 'Totally agree with this take',
                    link: '/r/rev-1',
                })}
                onMarkRead={vi.fn()}
            />
        )
        expect(screen.getByText('Jane Doe commented on your review')).toBeInTheDocument()
        expect(screen.getByText('Totally agree with this take')).toBeInTheDocument()
        expect(container.querySelector('svg.lucide-message-circle')).toBeInTheDocument()
        expect(screen.getByRole('link')).toHaveAttribute('href', '/r/rev-1')
    })

    it('renders review_reaction with icon, copy and link', () => {
        const { container } = render(
            <NotificationItem
                notification={makeNotification({
                    type: 'review_reaction',
                    title: 'John Doe reacted to your review',
                    body: 'Reaction: love',
                    link: '/r/rev-2',
                })}
                onMarkRead={vi.fn()}
            />
        )
        expect(screen.getByText('John Doe reacted to your review')).toBeInTheDocument()
        expect(screen.getByText('Reaction: love')).toBeInTheDocument()
        expect(container.querySelector('svg.lucide-heart')).toBeInTheDocument()
        expect(screen.getByRole('link')).toHaveAttribute('href', '/r/rev-2')
    })

    it('renders friend_attendance with icon, copy and link', () => {
        const { container } = render(
            <NotificationItem
                notification={makeNotification({
                    type: 'friend_attendance',
                    title: 'Jane Doe is going to an event',
                    body: 'Coldplay · Wembley Stadium',
                    link: '/events/evt-9',
                })}
                onMarkRead={vi.fn()}
            />
        )
        expect(screen.getByText('Jane Doe is going to an event')).toBeInTheDocument()
        expect(screen.getByText('Coldplay · Wembley Stadium')).toBeInTheDocument()
        expect(container.querySelector('svg.lucide-ticket')).toBeInTheDocument()
        expect(screen.getByRole('link')).toHaveAttribute('href', '/events/evt-9')
    })

    it('calls onMarkRead when an unread notification is clicked', () => {
        const onMarkRead = vi.fn()
        render(
            <NotificationItem
                notification={makeNotification({ id: 'notif-42', link: null })}
                onMarkRead={onMarkRead}
            />
        )
        fireEvent.click(screen.getByText('New event from Radiohead'))
        expect(onMarkRead).toHaveBeenCalledWith('notif-42')
    })

    it('does not call onMarkRead when already read', () => {
        const onMarkRead = vi.fn()
        render(
            <NotificationItem
                notification={makeNotification({ is_read: true, link: null })}
                onMarkRead={onMarkRead}
            />
        )
        fireEvent.click(screen.getByText('New event from Radiohead'))
        expect(onMarkRead).not.toHaveBeenCalled()
    })
})
