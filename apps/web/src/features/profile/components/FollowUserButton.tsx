import { UserPlus, UserCheck } from 'lucide-react'
import { useIsFollowingUser, useFollowUser, useUnfollowUser, useFollowerCount, useFollowingCount } from '../api/follows'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/utils'

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
        <button
            onClick={handleClick}
            disabled={isPending || isLoading}
            className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-surface-900',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                isFollowing
                    ? 'bg-surface-800 border border-surface-600 text-surface-300 hover:bg-surface-700'
                    : 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-glow'
            )}
        >
            {isFollowing ? (
                <>
                    <UserCheck className="w-4 h-4" />
                    Following
                </>
            ) : (
                <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                </>
            )}
        </button>
    )
}

interface FollowerCountsProps {
    userId: string
}

export function FollowerCounts({ userId }: FollowerCountsProps) {
    const { data: followerCount = 0 } = useFollowerCount(userId)
    const { data: followingCount = 0 } = useFollowingCount(userId)

    return (
        <div className="flex items-center gap-4 text-sm text-surface-400">
            <span><strong className="text-white">{followerCount}</strong> followers</span>
            <span><strong className="text-white">{followingCount}</strong> following</span>
        </div>
    )
}