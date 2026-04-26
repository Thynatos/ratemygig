import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapPin, Calendar, ExternalLink, Star, ChevronLeft } from 'lucide-react'
import { useVenue, useVenueRatingSummary, useVenueEvents } from '../api/venues'
import { FollowVenueButton } from '../components/FollowVenueButton'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { RatingDisplay } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { EventCard } from '@/features/events/components/EventCard'
import { Input } from '@/shared/components/ui/Input'
import { env } from '@/shared/lib/env'
import { getProviderModeLabel, isTicketmasterMode } from '@/shared/lib/provider-policy'
import { sanitizeText } from '@/shared/lib/sanitize'

export function VenueDetailPage() {
    const { venueId } = useParams<{ venueId: string }>()
    const yearChoices = useMemo(
        () => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i),
        []
    )
    const [summaryYear, setSummaryYear] = useState<number | ''>('')
    const [summaryCity, setSummaryCity] = useState('')

    const { data: venue, isLoading: venueLoading } = useVenue(venueId!)
    const { data: ratingSummary } = useVenueRatingSummary(venueId!, {
        year: summaryYear === '' ? undefined : summaryYear,
        city: summaryCity.trim() || undefined,
    })
    const { data: events = [] } = useVenueEvents(venueId!)

    if (venueLoading) return <LoadingPage message="Loading venue..." />

    if (!venue) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <h2 className="text-xl font-semibold text-white mb-2">Venue not found</h2>
                        <Link to="/venues">
                            <Button variant="secondary">Back to Venues</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const upcomingEvents = events.filter(e => new Date(e.start_at) >= new Date())
    const pastEvents = events.filter(e => new Date(e.start_at) < new Date())
    const showNoEventsState = events.length === 0

    return (
        <div className="page-container">
            {/* Back */}
            <Link
                to="/venues"
                className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-6 transition-colors"
            >
                <ChevronLeft className="w-5 h-5" />
                Back to Venues
            </Link>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Venue Header */}
                    <Card>
                        <CardContent className="p-6">
                            <h1 className="text-3xl font-display font-bold text-white mb-2">
                                {sanitizeText(venue.name)}
                            </h1>
                            <p className="flex items-center gap-2 text-lg text-surface-300 mb-4">
                                <MapPin className="w-5 h-5 text-primary-400" />
                                {sanitizeText(venue.city)}, {sanitizeText(venue.country)}
                            </p>

                            {/* Map Link */}
                            <a
                                href={`https://maps.google.com/?q=${encodeURIComponent(
                                    `${venue.name}, ${venue.city}`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300"
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on Google Maps
                            </a>

                            <div className="mt-4">
                                <FollowVenueButton venueId={venue.id} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Upcoming Events */}
                    {upcomingEvents.length > 0 && (
                        <section>
                            <h2 className="section-title mb-4 flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-primary-400" />
                                Upcoming Events
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
                            <h2 className="section-title mb-4 text-surface-400">Past Events</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                {pastEvents.slice(0, 4).map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </section>
                    )}

                    {showNoEventsState && (
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Calendar className="w-10 h-10 text-surface-600 mx-auto mb-3" />
                                <h2 className="text-xl font-semibold text-white mb-2">No events at this venue yet</h2>
                                <p className="text-surface-400 mb-3">
                                    {isTicketmasterMode()
                                        ? 'This venue does not have any Ticketmaster events in the current data source.'
                                        : 'There are no events for this venue in the current catalog.'}
                                </p>
                                <p className="text-xs uppercase tracking-[0.2em] text-surface-500">
                                    Current source: {getProviderModeLabel(env.EVENTS_PROVIDER)}
                                </p>
                            </CardContent>
                        </Card>
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

                            <div className="space-y-3 mb-4 text-left">
                                <label className="block text-xs text-surface-500 uppercase tracking-wide">
                                    Event year
                                    <select
                                        value={summaryYear === '' ? '' : String(summaryYear)}
                                        onChange={e => {
                                            const v = e.target.value
                                            setSummaryYear(v === '' ? '' : Number(v))
                                        }}
                                        className="mt-1 w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-white"
                                    >
                                        <option value="">All years</option>
                                        {yearChoices.map(y => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="block text-xs text-surface-500 uppercase tracking-wide">
                                    Event city (optional)
                                    <Input
                                        value={summaryCity}
                                        onChange={e => setSummaryCity(e.target.value)}
                                        placeholder="e.g. New York"
                                        className="mt-1"
                                    />
                                </label>
                            </div>

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
                                    <span className="text-surface-400">Total Events</span>
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
