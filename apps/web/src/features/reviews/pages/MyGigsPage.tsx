import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { parseISO, isValid } from 'date-fns'
import { useMyGigs } from '../api/reviews'
import { buildIcs } from '@/shared/lib/ical'
import { downloadTextFile, exportToCsv, formatDate } from '@/shared/lib/utils'
import { DraftReviewsSection } from '../components/DraftReviewsSection'
import { FollowedArtistsList } from '@/features/artists/components/FollowedArtistsList'
import { FollowedVenuesList } from '@/features/venues/components/FollowedVenuesList'
import { Button } from '@/shared/components/ui/Button'
import { ScoreStrip } from '@/shared/components/ui/StarRating'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import {
    BoardHeader,
    DateSlot,
    EmptyState,
    Figure,
    FigureRail,
} from '@/shared/components/ui/Board'
import { cn } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

type TabType = 'all' | 'planned' | 'attended' | 'tracked-artists' | 'tracked-venues'

const TABS: { id: TabType; label: string }[] = [
    { id: 'all', label: 'Everything' },
    { id: 'planned', label: 'Going' },
    { id: 'attended', label: 'Been' },
    { id: 'tracked-artists', label: 'Artists' },
    { id: 'tracked-venues', label: 'Venues' },
]

export function MyGigsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const statusFilter =
        activeTab === 'planned' ? 'planned' : activeTab === 'attended' ? 'attended' : undefined
    const showGigs = activeTab === 'all' || activeTab === 'planned' || activeTab === 'attended'
    const { data: gigs, isLoading } = useMyGigs(showGigs ? statusFilter : undefined)
    const { data: allGigs } = useMyGigs()

    const stats = useMemo(() => {
        const list = allGigs ?? []
        const attended = list.filter(g => g.status === 'attended')
        const rated = list.filter(g => g.review && g.review.length > 0)
        const thisYear = attended.filter(g => {
            const d = g.event ? parseISO(g.event.start_at) : null
            return d && isValid(d) && d.getFullYear() === new Date().getFullYear()
        })
        const rooms = new Set(
            attended.map(g => g.event?.venue?.name).filter(Boolean) as string[]
        )
        return {
            attended: attended.length,
            rated: rated.length,
            thisYear: thisYear.length,
            rooms: rooms.size,
        }
    }, [allGigs])

    const handleExportCsv = () => {
        if (!gigs || gigs.length === 0) return
        const rows = gigs
            .filter(gig => gig.event)
            .map(gig => {
                const event = gig.event!
                const review = gig.review && gig.review.length > 0 ? gig.review[0] : null
                return {
                    Date: formatDate(event.start_at, 'yyyy-MM-dd'),
                    'Event Name': event.name,
                    Artist: event.lineup?.join(', ') ?? '',
                    Venue: event.venue?.name ?? '',
                    City: event.city,
                    Country: event.country ?? '',
                    Status: gig.status,
                    Rating: review?.rating ?? '',
                    'Review Title': review?.title ?? '',
                    'Review Body': review?.body ?? '',
                }
            })
        exportToCsv(rows, `my-gigs-${new Date().toISOString().split('T')[0]}.csv`)
    }

    const handleExportCalendar = () => {
        if (!allGigs || allGigs.length === 0) return
        const events = allGigs
            .filter(gig => gig.event)
            .map(gig => ({
                id: gig.event.id as string,
                name: gig.event.name as string,
                startAt: gig.event.start_at as string,
                venueName: gig.event.venue?.name ?? null,
                city: gig.event.city as string,
                ticketUrl: gig.event.ticket_urls?.[0]?.url ?? null,
            }))
        const ics = buildIcs(events)
        downloadTextFile(
            ics,
            `my-gigs-${new Date().toISOString().split('T')[0]}.ics`,
            'text/calendar;charset=utf-8;'
        )
    }

    const hasAnyGigs = Boolean(allGigs && allGigs.length > 0)

    const emptyBody =
        activeTab === 'planned'
            ? "Nothing marked as going. Find something on and press “I want to go”."
            : activeTab === 'attended'
                ? "Nothing marked as been to. Open a gig you went to and press “I was there”."
                : 'Your archive starts with one night. Find a gig you went to and log it.'

    return (
        <div className="page page-body">
            <BoardHeader
                strip={
                    hasAnyGigs
                        ? `${stats.attended} ${stats.attended === 1 ? 'gig' : 'gigs'} logged`
                        : 'Nothing logged yet'
                }
                title="My gigs"
                lede="Everything you've been to and everything you're going to, oldest habit first."
                action={
                    hasAnyGigs ? (
                        <>
                            <Button variant="secondary" size="sm" onClick={handleExportCalendar}>
                                Export calendar
                            </Button>
                            {gigs && gigs.length > 0 && (
                                <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                                    Export CSV
                                </Button>
                            )}
                        </>
                    ) : undefined
                }
            >
                {hasAnyGigs && (
                    <FigureRail>
                        <Figure value={stats.attended} label="Gigs been to" accent />
                        <Figure value={stats.rated} label="Rated" />
                        <Figure value={stats.rooms} label="Rooms" />
                        <Figure value={stats.thisYear} label={`In ${new Date().getFullYear()}`} />
                    </FigureRail>
                )}
            </BoardHeader>

            <DraftReviewsSection />

            <div className="tab-rail mb-4" role="tablist" aria-label="Filter your gigs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={`tab-${tab.id}`}
                        aria-selected={activeTab === tab.id}
                        aria-controls="my-gigs-panel"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn('tab', activeTab === tab.id && 'tab-active')}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div id="my-gigs-panel" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
                {activeTab === 'tracked-artists' && <FollowedArtistsList />}
                {activeTab === 'tracked-venues' && <FollowedVenuesList />}

                {showGigs && (
                    <>
                        {isLoading && <RowSkeletonList count={5} label="Loading your gigs" />}

                        {!isLoading && (!gigs || gigs.length === 0) && (
                            <EmptyState
                                title={
                                    activeTab === 'all'
                                        ? 'Nothing logged yet'
                                        : activeTab === 'planned'
                                            ? 'Nothing coming up'
                                            : 'Nothing logged yet'
                                }
                                body={emptyBody}
                                action={
                                    <Link to="/" className="btn-primary">
                                        See what's on
                                    </Link>
                                }
                            />
                        )}

                        {!isLoading && gigs && gigs.length > 0 && (
                            <div className="rail-list">
                                {gigs.map(gig => {
                                    const event = gig.event
                                    if (!event) return null

                                    const review =
                                        gig.review && gig.review.length > 0 ? gig.review[0] : null
                                    const attended = gig.status === 'attended'

                                    return (
                                        <div key={gig.id} className="row items-start">
                                            <span className="row-slot">
                                                <DateSlot date={event.start_at} />
                                            </span>

                                            <span className="row-body">
                                                <Link
                                                    to={`/events/${event.id}`}
                                                    className="row-title hover:text-strip"
                                                >
                                                    {sanitizeText(event.name)}
                                                </Link>
                                                <span className="row-meta">
                                                    {sanitizeText(
                                                        event.venue?.name || 'Venue unknown'
                                                    )}{' '}
                                                    · {sanitizeText(event.city)}
                                                </span>
                                                <span className="voice-label text-bone-faint">
                                                    {attended ? 'You were there' : 'Going'}
                                                </span>
                                            </span>

                                            <span className="row-end gap-2">
                                                {review ? (
                                                    <>
                                                        <span className="flex items-center gap-2">
                                                            <span className="voice-board tnum text-board-md text-strip leading-none">
                                                                {review.rating.toFixed(1)}
                                                            </span>
                                                            <ScoreStrip
                                                                value={review.rating}
                                                                size="sm"
                                                            />
                                                        </span>
                                                        <Link
                                                            to={`/review/${event.id}/edit`}
                                                            className="voice-label text-bone-dim hover:text-strip"
                                                        >
                                                            Edit review
                                                        </Link>
                                                    </>
                                                ) : attended ? (
                                                    <Link
                                                        to={`/review/${event.id}`}
                                                        className="btn-primary"
                                                    >
                                                        Rate the night
                                                    </Link>
                                                ) : null}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
