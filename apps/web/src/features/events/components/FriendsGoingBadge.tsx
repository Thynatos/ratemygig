import { Avatar } from '@/shared/components/ui/Avatar'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { FriendGoing } from '../api/useFriendsGoing'

interface FriendsGoingBadgeProps {
    friends?: FriendGoing[]
}

export function FriendsGoingBadge({ friends }: FriendsGoingBadgeProps) {
    if (!friends || friends.length === 0) return null

    const names = friends.slice(0, 2).map(f => sanitizeText(f.displayName)).join(', ')
    const rest = friends.length - 2

    return (
        <span className="inline-flex items-center gap-2">
            <span className="flex -space-x-px">
                {friends.slice(0, 3).map(friend => (
                    <Avatar
                        key={friend.userId}
                        src={friend.avatarUrl}
                        name={sanitizeText(friend.displayName)}
                        size="sm"
                        className="w-6 h-6 text-[0.5625rem]"
                    />
                ))}
            </span>
            <span className="voice-label text-strip">
                {names}
                {rest > 0 && ` +${rest}`} going
            </span>
        </span>
    )
}
