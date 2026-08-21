import { Link } from 'react-router-dom'
import { useFollowedVenues } from '../api/venues'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { EmptyState } from '@/shared/components/ui/Board'
import { sanitizeText } from '@/shared/lib/sanitize'

export function FollowedVenuesList() {
    const { user } = useAuth()
    const { data: follows, isLoading } = useFollowedVenues()

    if (!user) {
        return (
            <EmptyState
                title="Sign in to follow venues"
                body="Following a room puts its new listings in your notifications."
                action={
                    <Link to="/login" className="btn-primary">
                        Sign in
                    </Link>
                }
            />
        )
    }

    if (isLoading) {
        return <RowSkeletonList count={3} label="Loading venues you follow" />
    }

    if (!follows || follows.length === 0) {
        return (
            <EmptyState
                title="You're not following any rooms"
                body="Follow a venue and its new listings turn up in your notifications."
                action={
                    <Link to="/venues" className="btn-primary">
                        Browse venues
                    </Link>
                }
            />
        )
    }

    return (
        <ul className="rail-list">
            {follows.map(
                (follow: { id: string; venue: { id: string; name: string; city: string } }) => {
                    const venue = follow.venue
                    if (!venue) return null
                    const name = sanitizeText(venue.name)

                    return (
                        <li key={follow.id}>
                            <Link to={`/venues/${venue.id}`} className="row row-interactive">
                                <span className="row-slot">
                                    <span
                                        className="voice-board text-bone-dim text-[1.75rem] leading-none"
                                        aria-hidden="true"
                                    >
                                        {name.charAt(0)}
                                    </span>
                                </span>
                                <span className="row-body">
                                    <span className="row-title">{name}</span>
                                    <span className="row-meta">{sanitizeText(venue.city)}</span>
                                </span>
                            </Link>
                        </li>
                    )
                }
            )}
        </ul>
    )
}
