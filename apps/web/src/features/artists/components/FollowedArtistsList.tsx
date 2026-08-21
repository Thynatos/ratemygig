import { Link } from 'react-router-dom'
import { useFollowedArtists } from '../api/artists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { EmptyState } from '@/shared/components/ui/Board'
import { sanitizeText } from '@/shared/lib/sanitize'

export function FollowedArtistsList() {
    const { user } = useAuth()
    const { data: follows, isLoading } = useFollowedArtists()

    if (!user) {
        return (
            <EmptyState
                title="Sign in to follow artists"
                body="Following an artist puts their new dates in your notifications."
                action={
                    <Link to="/login" className="btn-primary">
                        Sign in
                    </Link>
                }
            />
        )
    }

    if (isLoading) {
        return <RowSkeletonList count={3} label="Loading artists you follow" />
    }

    if (!follows || follows.length === 0) {
        return (
            <EmptyState
                title="You're not following anyone"
                body="Follow an artist and their new dates turn up in your notifications."
                action={
                    <Link to="/artists" className="btn-primary">
                        Browse artists
                    </Link>
                }
            />
        )
    }

    return (
        <ul className="rail-list">
            {follows.map((follow: { id: string; artist: { id: string; name: string } }) => {
                const artist = follow.artist
                if (!artist) return null
                const name = sanitizeText(artist.name)

                return (
                    <li key={follow.id}>
                        <Link to={`/artists/${artist.id}`} className="row row-interactive">
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
                                <span className="row-meta">Following</span>
                            </span>
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}
