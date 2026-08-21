import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useArtist, useArtistRatingSummary, useArtistEvents } from '../api/artists'
import { FollowArtistButton } from '../components/FollowArtistButton'
import { useArtistSetlistStats } from '@/features/setlists/api/stats'
import { ArtistSetlistSummary } from '@/features/setlists/components/ArtistSetlistSummary'
import { SongStatsList } from '@/features/setlists/components/SongStatsList'
import { useVenues } from '@/features/venues/api/venues'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import {
    BoardHeader,
    EmptyState,
    Figure,
    FigureRail,
} from '@/shared/components/ui/Board'
import { Distribution } from '@/shared/components/Leaderboard'
import { EventCard } from '@/features/events/components/EventCard'
import { useFriendsGoing } from '@/features/events/api/useFriendsGoing'
import { usePageMeta } from '@/shared/hooks'
import { whenLabel } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import { env } from '@/shared/lib/env'
import { getProviderModeLabel, isTicketmasterMode } from '@/shared/lib/provider-policy'

export function ArtistDetailPage() {
    const { artistId } = useParams<{ artistId: string }>()
    const yearChoices = useMemo(
        () => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i),
        []
    )
    const [summaryYear, setSummaryYear] = useState<number | ''>('')
    const [summaryVenueId, setSummaryVenueId] = useState('')

    const { data: artist, isLoading: artistLoading } = useArtist(artistId!)
    const { data: venuesResult } = useVenues()
    const venueList = venuesResult?.data ?? []
    const { data: ratingSummary } = useArtistRatingSummary(artistId!, {
        year: summaryYear === '' ? undefined : summaryYear,
        venue_id: summaryVenueId || undefined,
    })
    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no shows yet" (audit finding A13).
    const {
        data: eventsData,
        isError: eventsError,
        refetch: refetchEvents,
    } = useArtistEvents(artistId!)
    // useMemo keeps a stable identity for the memo deps below (and avoids
    // allocating a fresh array on every render while loading).
    const events = useMemo(() => eventsData ?? [], [eventsData])
    const { data: artistSetlistStats } = useArtistSetlistStats(artistId!)
    const visibleEventIds = useMemo(() => {
        const now = new Date()
        const upcoming = events.filter(e => new Date(e.start_at) >= now)
        const past = events.filter(e => new Date(e.start_at) < now).slice(0, 6)
        return [...upcoming, ...past].map(e => e.id)
    }, [events])
    const { data: friendsGoing } = useFriendsGoing(visibleEventIds)

    usePageMeta(
        artist
            ? {
                title: artist.name,
                description: `${artist.name} — ratings, upcoming events`,
                canonicalPath: `/artists/${artist.id}`,
            }
            : null
    )

    if (artistLoading) return <LoadingPage message="Opening the artist" />

    if (!artist) {
        return (
            <div className="page page-body">
                <EmptyState
                    title="No such artist"
                    body="Nobody by that name is on the board, or the link is wrong."
                    action={
                        <Link to="/artists" className="btn-secondary">
                            Browse all artists
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
    const rooms = new Set(events.map(e => e.venue?.name).filter(Boolean) as string[])
    const selectedVenue = venueList.find(v => v.id === summaryVenueId)

    return (
        <div className="page page-body">
            <Link
                to="/artists"
                className="inline-flex items-center gap-1.5 voice-label text-bone-faint hover:text-bone mb-5"
            >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                Artists
            </Link>

            <BoardHeader
                strip={
                    nextEvent
                        ? `Next: ${whenLabel(nextEvent.start_at)} · ${sanitizeText(nextEvent.venue?.name || nextEvent.city)}`
                        : 'No dates announced'
                }
                title={sanitizeText(artist.name)}
                lede={
                    events.length > 0
                        ? `${events.length} ${events.length === 1 ? 'gig' : 'gigs'} on the board across ${rooms.size} ${rooms.size === 1 ? 'room' : 'rooms'}.`
                        : 'No gigs on the board yet.'
                }
                action={<FollowArtistButton artistId={artist.id} />}
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
                    <Figure value={rooms.size} label="Rooms played" />
                </FigureRail>
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
                                Been and gone
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
                            title="Couldn't load their gigs"
                            onRetry={() => refetchEvents()}
                        />
                    )}

                    {!eventsError && showNoEventsState && (
                        <EmptyState
                            title="No gigs on file"
                            body={
                                isTicketmasterMode()
                                    ? `No Ticketmaster listings for them in the current source (${getProviderModeLabel(env.EVENTS_PROVIDER)}).`
                                    : `Nothing in the current catalogue (${getProviderModeLabel(env.EVENTS_PROVIDER)}) has them playing.`
                            }
                            action={
                                <Link to="/" className="btn-secondary">
                                    See what's on
                                </Link>
                            }
                        />
                    )}

                    <ArtistSetlistSummary artistId={artist.id} />

                    {artistSetlistStats && artistSetlistStats.setlist_count > 0 && (
                        <section>
                            <h2 className="voice-label text-bone-dim mb-3">
                                What they play
                            </h2>
                            <SongStatsList artistId={artist.id} />
                        </section>
                    )}
                </div>

                <div className="space-y-8">
                    <section className="border border-rail bg-board">
                        <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                            How they rate
                        </h2>

                        <div className="px-4 py-3.5 border-b border-rail space-y-3">
                            <div>
                                <label htmlFor="artist-summary-year" className="input-label">
                                    Gigs from
                                </label>
                                <select
                                    id="artist-summary-year"
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

                            <div>
                                <label htmlFor="artist-summary-venue" className="input-label">
                                    In this room
                                </label>
                                <select
                                    id="artist-summary-venue"
                                    value={summaryVenueId}
                                    onChange={e => setSummaryVenueId(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="">Any room</option>
                                    {venueList.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {sanitizeText(v.name)} — {sanitizeText(v.city)}
                                        </option>
                                    ))}
                                </select>
                                <p className="input-hint">
                                    A gig is never the same twice. Narrow it down to compare rooms.
                                </p>
                            </div>
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
                                    {selectedVenue
                                        ? `Nobody has rated them at ${sanitizeText(selectedVenue.name)}${summaryYear === '' ? '' : ` in ${summaryYear}`}.`
                                        : summaryYear === ''
                                            ? 'Nobody has rated one of their gigs yet. Log one you went to and you set the first score.'
                                            : `No rated gigs in ${summaryYear}. Try another year.`}
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
