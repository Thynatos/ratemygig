import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ExternalLink, ChevronLeft } from 'lucide-react'
import { useVenue, useVenueRatingSummary, useVenueEvents } from '../api/venues'
import { FollowVenueButton } from '../components/FollowVenueButton'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import {
    BoardHeader,
    EmptyState,
    Figure,
    FigureRail,
    whenLabel,
} from '@/shared/components/ui/Board'
import { Distribution } from '@/shared/components/Leaderboard'
import { EventCard } from '@/features/events/components/EventCard'
import { useFriendsGoing } from '@/features/events/api/useFriendsGoing'
import { usePageMeta } from '@/shared/hooks'
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

    const { data: venue, isLoading: venueLoading } = useVenue(venueId!)
    const { data: ratingSummary } = useVenueRatingSummary(venueId!, {
        year: summaryYear === '' ? undefined : summaryYear,
    })
    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no events yet" (audit finding A13).
    const {
        data: eventsData,
        isError: eventsError,
        refetch: refetchEvents,
    } = useVenueEvents(venueId!)
    // useMemo keeps a stable identity for the memo deps below (and avoids
    // allocating a fresh array on every render while loading).
    const events = useMemo(() => eventsData ?? [], [eventsData])
    const visibleEventIds = useMemo(() => {
        const now = new Date()
        const upcoming = events.filter(e => new Date(e.start_at) >= now)
        const past = events.filter(e => new Date(e.start_at) < now).slice(0, 6)
        return [...upcoming, ...past].map(e => e.id)
    }, [events])
    const { data: friendsGoing } = useFriendsGoing(visibleEventIds)

    usePageMeta(
        venue
            ? {
                title: venue.name,
                description: `${venue.name}, ${venue.city} — ratings, upcoming events`,
                canonicalPath: `/venues/${venue.id}`,
            }
            : null
    )

    if (venueLoading) return <LoadingPage message="Opening the room" />

    if (!venue) {
        return (
            <div className="page page-body">
                <EmptyState
                    title="No such venue"
                    body="This room isn't on the board, or the link is wrong."
                    action={
                        <Link to="/venues" className="btn-secondary">
                            Browse all venues
                        </Link>
                    }
                />
            </div>
        )
    }

    const now = new Date()
    const upcomingEvents = events.filter(e => new Date(e.start_at) >= now)
    const pastEvents = events.filter(e => new Date(e.start_at) < now)
    const showNoEventsState = events.length === 0
    const nextEvent = upcomingEvents[0]
    const hasRatings = Boolean(ratingSummary && Number(ratingSummary.count_reviews) > 0)

    return (
        <div className="page page-body">
            <Link
                to="/venues"
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Venues
            </Link>

            <BoardHeader
                strip={
                    nextEvent
                        ? `Next: ${whenLabel(nextEvent.start_at)} · ${sanitizeText(nextEvent.name)}`
                        : 'Nothing coming up'
                }
                title={sanitizeText(venue.name)}
                lede={
                    <>
                        {sanitizeText(venue.city)}, {sanitizeText(venue.country)}
                    </>
                }
                action={<FollowVenueButton venueId={venue.id} />}
            >
                <FigureRail>
                    <Figure
                        value={hasRatings ? Number(ratingSummary!.avg_rating).toFixed(1) : '—'}
                        label="Average score"
                        accent={hasRatings}
                        note={
                            hasRatings
                                ? `${ratingSummary!.count_reviews} ${Number(ratingSummary!.count_reviews) === 1 ? 'review' : 'reviews'}`
                                : 'Not rated yet'
                        }
                    />
                    <Figure value={events.length} label="Gigs on file" />
                    <Figure value={upcomingEvents.length} label="Coming up" />
                    <Figure value={pastEvents.length} label="Been and gone" />
                </FigureRail>

                <p className="mt-3">
                    <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                            `${venue.name}, ${venue.city}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 voice-label text-bone-dim hover:text-strip"
                    >
                        Find it on a map
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                </p>
            </BoardHeader>

            <div className="grid gap-8 lg:gap-10 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-10">
                    {upcomingEvents.length > 0 && (
                        <section>
                            <h2 className="voice-label text-bone-dim mb-3">Coming up</h2>
                            <div className="rail-list">
                                {upcomingEvents.map(event => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        friendsGoing={friendsGoing?.get(event.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {pastEvents.length > 0 && (
                        <section>
                            <h2 className="voice-label text-bone-dim mb-3">
                                Played here
                                <span className="ml-2 tnum text-bone-faint">
                                    {pastEvents.length}
                                </span>
                            </h2>
                            <div className="rail-list">
                                {pastEvents.slice(0, 6).map(event => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        friendsGoing={friendsGoing?.get(event.id)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {eventsError && (
                        <QueryErrorState
                            title="Couldn't load this room's gigs"
                            onRetry={() => refetchEvents()}
                        />
                    )}

                    {!eventsError && showNoEventsState && (
                        <EmptyState
                            title="No gigs on file here"
                            body={
                                isTicketmasterMode()
                                    ? `This room has no Ticketmaster listings in the current source (${getProviderModeLabel(env.EVENTS_PROVIDER)}).`
                                    : `Nothing in the current catalogue (${getProviderModeLabel(env.EVENTS_PROVIDER)}) happens here.`
                            }
                            action={
                                <Link to="/" className="btn-secondary">
                                    See what's on elsewhere
                                </Link>
                            }
                        />
                    )}
                </div>

                <div className="space-y-8">
                    <section className="border border-rail bg-board">
                        <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                            How this room rates
                        </h2>

                        <div className="px-4 py-3.5 border-b border-rail">
                            <label htmlFor="venue-summary-year" className="input-label">
                                Gigs from
                            </label>
                            <select
                                id="venue-summary-year"
                                value={summaryYear === '' ? '' : String(summaryYear)}
                                onChange={e => {
                                    const v = e.target.value
                                    setSummaryYear(v === '' ? '' : Number(v))
                                }}
                                className="input-field"
                            >
                                <option value="">Every year</option>
                                {yearChoices.map(y => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="px-4 py-4">
                            {hasRatings ? (
                                <>
                                    <div className="flex items-end gap-3 mb-4">
                                        <span className="voice-board tnum text-strip leading-[0.8] text-[3rem]">
                                            {Number(ratingSummary!.avg_rating).toFixed(1)}
                                        </span>
                                        <span className="pb-1.5">
                                            <ScoreStrip
                                                value={Number(ratingSummary!.avg_rating)}
                                                size="sm"
                                            />
                                        </span>
                                    </div>
                                    <Distribution distribution={ratingSummary!} variant="full" />
                                </>
                            ) : (
                                <p className="text-ui-sm text-bone-dim">
                                    {summaryYear === ''
                                        ? 'Nobody has rated a gig in this room yet. Log one you went to and you set the first score.'
                                        : `No rated gigs here in ${summaryYear}. Try another year.`}
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
