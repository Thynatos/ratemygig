import { Check } from 'lucide-react'
import { useIsFollowingArtist, useFollowArtist, useUnfollowArtist } from '../api/artists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'

interface FollowArtistButtonProps {
    artistId: string
}

/**
 * Following is a printed mark, not a colour: pressed fills the slot amber,
 * unpressed is a hairline outline. Same object either way.
 */
export function FollowArtistButton({ artistId }: FollowArtistButtonProps) {
    const { user } = useAuth()
    const { data: isFollowing, isLoading } = useIsFollowingArtist(artistId)
    const followMutation = useFollowArtist(artistId)
    const unfollowMutation = useUnfollowArtist(artistId)

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
