import { Link } from 'react-router-dom'
import { Music } from 'lucide-react'
import { useFollowedArtists } from '../api/artists'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { EventCardSkeleton } from '@/shared/components/ui/Loading'
import { sanitizeText } from '@/shared/lib/sanitize'

export function FollowedArtistsList() {
    const { user } = useAuth()
    const { data: follows, isLoading } = useFollowedArtists()

    if (!user) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Music className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <p className="text-surface-400">Sign in to track artists</p>
                </CardContent>
            </Card>
        )
    }

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <EventCardSkeleton key={i} />
                ))}
            </div>
        )
    }

    if (!follows || follows.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Music className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No tracked artists yet</h3>
                    <p className="text-surface-400 mb-6">Track artists to see their upcoming shows here</p>
                    <Link to="/artists">
                        <Button>Browse Artists</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {follows.map((follow: { id: string; artist: { id: string; name: string } }) => {
                const artist = follow.artist
                if (!artist) return null

                return (
                    <Link key={follow.id} to={`/artists/${artist.id}`}>
                        <Card hoverable>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500/30 to-primary-500/30 flex items-center justify-center text-sm font-bold text-white border-2 border-surface-700">
                                        {sanitizeText(artist.name).charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{sanitizeText(artist.name)}</p>
                                        <p className="text-sm text-surface-400">View upcoming shows</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                )
            })}
        </div>
    )
}