import { Heart } from 'lucide-react'
import { useIsFollowingVenue, useFollowVenue, useUnfollowVenue } from '../api/venues'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/utils'

interface FollowVenueButtonProps {
    venueId: string
}

export function FollowVenueButton({ venueId }: FollowVenueButtonProps) {
    const { user } = useAuth()
    const { data: isFollowing, isLoading } = useIsFollowingVenue(venueId)
    const followMutation = useFollowVenue(venueId)
    const unfollowMutation = useUnfollowVenue(venueId)

    if (!user) return null

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
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/30 hover:bg-accent-500/30'
                    : 'bg-surface-800 border border-surface-600 text-surface-100 hover:bg-surface-700 hover:border-surface-500'
            )}
        >
            <Heart
                className={cn('w-4 h-4', isFollowing && 'fill-current')}
            />
            {isFollowing ? 'Tracking' : 'Track Venue'}
        </button>
    )
}