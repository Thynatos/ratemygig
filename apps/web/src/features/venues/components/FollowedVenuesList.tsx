import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { useFollowedVenues } from '../api/venues'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { EventCardSkeleton } from '@/shared/components/ui/Loading'

export function FollowedVenuesList() {
    const { user } = useAuth()
    const { data: follows, isLoading } = useFollowedVenues()

    if (!user) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <MapPin className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <p className="text-surface-400">Sign in to track venues</p>
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
                    <MapPin className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No tracked venues yet</h3>
                    <p className="text-surface-400 mb-6">Track venues to see their upcoming events here</p>
                    <Link to="/venues">
                        <Button>Browse Venues</Button>
                    </Link>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            {follows.map((follow: { id: string; venue: { id: string; name: string; city: string } }) => {
                const venue = follow.venue
                if (!venue) return null

                return (
                    <Link key={follow.id} to={`/venues/${venue.id}`}>
                        <Card hoverable>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500/30 to-accent-500/30 flex items-center justify-center border-2 border-surface-700">
                                        <MapPin className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{venue.name}</p>
                                        <p className="text-sm text-surface-400">{venue.city}</p>
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