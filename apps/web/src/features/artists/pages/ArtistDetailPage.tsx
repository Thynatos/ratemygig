import { useParams, Link } from 'react-router-dom'
import { Users, Calendar, Star, ChevronLeft } from 'lucide-react'
import { useArtist, useArtistRatingSummary, useArtistEvents } from '../api/artists'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { RatingDisplay } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { EventCard } from '@/features/events/components/EventCard'

export function ArtistDetailPage() {
    const { artistId } = useParams<{ artistId: string }>()

    const { data: artist, isLoading: artistLoading } = useArtist(artistId!)
    const { data: ratingSummary } = useArtistRatingSummary(artistId!)
    const { data: events = [] } = useArtistEvents(artistId!)

    if (artistLoading) return <LoadingPage message="Loading artist..." />

    if (!artist) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <h2 className="text-xl font-semibold text-white mb-2">Artist not found</h2>
                        <Link to="/artists">
                            <Button variant="secondary">Back to Artists</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const upcomingEvents = events.filter(e => new Date(e.start_at) >= new Date())
    const pastEvents = events.filter(e => new Date(e.start_at) < new Date())

    return (
        <div className="page-container">
            {/* Back */}
            <Link
                to="/artists"
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                Back to Artists
            </Link>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Artist Header */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center gap-6">
                                {/* Avatar */}
                                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-500/30 to-primary-500/30 flex items-center justify-center text-4xl font-bold text-white border-4 border-surface-700">
                                    {artist.name.charAt(0)}
                                </div>

                                <div>
                                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                                        {artist.name}
                                    </h1>
                                    <p className="flex items-center gap-2 text-surface-400">
                                        <Users className="w-5 h-5" />
                                        {events.length} {events.length === 1 ? 'concert' : 'concerts'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <section>
                            <h2 className="section-title mb-4 flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-primary-400" />
                                Upcoming Shows
                            </h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {upcomingEvents.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Past Events */}
                    {pastEvents.length > 0 && (
                        <section>
                            <h2 className="section-title mb-4 text-surface-400">Past Shows</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {pastEvents.slice(0, 4).map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Rating Summary */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-400" />
                                Rating Summary
                            </h3>

                            {ratingSummary ? (
                                <div className="text-center">
                                    <div className="text-4xl font-bold text-white mb-2">
                                        {ratingSummary.avg_rating.toFixed(1)}
                                    </div>
                                    <RatingDisplay
                                        rating={Number(ratingSummary.avg_rating)}
                                        count={Number(ratingSummary.count_reviews)}
                                    />

                                    {/* Rating Distribution */}
                                    <div className="mt-6 space-y-2">
                                        {[5, 4, 3, 2, 1].map(stars => {
                                            const count = Number(ratingSummary[`rating_${stars}` as keyof typeof ratingSummary] || 0)
                                            const total = Number(ratingSummary.count_reviews) || 1
                                            const percentage = (count / total) * 100

                                            return (
                                                <div key={stars} className="flex items-center gap-2 text-sm">
                                                    <span className="w-8 text-surface-400">{stars}★</span>
                                                    <div className="flex-1 h-2 bg-surface-700 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-yellow-400 rounded-full"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="w-8 text-surface-500 text-right">{count}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Star className="w-12 h-12 text-surface-600 mx-auto mb-2" />
                                    <p className="text-surface-400">No ratings yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Stats</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-surface-400">Total Shows</span>
                                    <span className="font-medium text-white">{events.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-surface-400">Upcoming</span>
                                    <span className="font-medium text-white">{upcomingEvents.length}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
