import { Avatar } from '@/shared/components/ui/Avatar'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { FriendGoing } from '../api/useFriendsGoing'

interface FriendsGoingBadgeProps {
    friends?: FriendGoing[]
}

export function FriendsGoingBadge({ friends }: FriendsGoingBadgeProps) {
    if (!friends || friends.length === 0) return null

    return (
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                {friends.slice(0, 3).map(friend => (
                    <Avatar
                        key={friend.userId}
                        src={friend.avatarUrl}
                        name={sanitizeText(friend.displayName)}
                        size="sm"
                        className="ring-2 ring-surface-900"
                    />
                ))}
            </div>
            <span className="text-xs font-medium text-primary-300">
                {friends.length} {friends.length === 1 ? 'friend' : 'friends'} going
            </span>
        </div>
    )
}
