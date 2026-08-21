import { Check } from 'lucide-react'
import { useIsFollowingVenue, useFollowVenue, useUnfollowVenue } from '../api/venues'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'

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
