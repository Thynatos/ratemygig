import { Check } from 'lucide-react'
import {
    useIsFollowingUser,
    useFollowUser,
    useUnfollowUser,
    useFollowerCount,
    useFollowingCount,
} from '../api/follows'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'

interface FollowUserButtonProps {
    userId: string
}

export function FollowUserButton({ userId }: FollowUserButtonProps) {
    const { user } = useAuth()
    const { data: isFollowing, isLoading } = useIsFollowingUser(userId)
    const followMutation = useFollowUser(userId)
    const unfollowMutation = useUnfollowUser(userId)

    if (!user || user.id === userId) return null

    const isPending = followMutation.isPending || unfollowMutation.isPending

    const handleClick = () => {
        if (isFollowing) {
            unfollowMutation.mutate()
        } else {
            followMutation.mutate()
        }
    }

    return (
        <Button
            variant={isFollowing ? 'primary' : 'secondary'}
            onClick={handleClick}
            disabled={isLoading}
            isLoading={isPending}
            loadingLabel={isFollowing ? 'Stopping' : 'Following'}
            aria-pressed={Boolean(isFollowing)}
        >
            {isFollowing && <Check className="w-4 h-4" aria-hidden="true" />}
            {isFollowing ? 'Following' : 'Follow'}
        </Button>
    )
}

interface FollowerCountsProps {
    userId: string
}

export function FollowerCounts({ userId }: FollowerCountsProps) {
    const { data: followerCount = 0 } = useFollowerCount(userId)
    const { data: followingCount = 0 } = useFollowingCount(userId)

    return (
        <p className="flex items-center gap-4 voice-label text-bone-faint">
            <span>
                <span className="tnum text-bone">{followerCount}</span> followers
            </span>
            <span>
                <span className="tnum text-bone">{followingCount}</span> following
            </span>
        </p>
    )
}
