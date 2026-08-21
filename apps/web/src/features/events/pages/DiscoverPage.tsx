import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useEvents } from '../api/events'
import { useFriendsGoing } from '../api/useFriendsGoing'
import { EventCard } from '../components/EventCard'
import { CitySelector } from '../components/CitySelector'
import { RecommendedEventsSection } from '@/features/discovery/components/RecommendedEventsSection'
import { TrendingEventsSection } from '@/features/discovery/components/TrendingEventsSection'
import { NearbyVenuesSection } from '@/features/discovery/components/NearbyVenuesSection'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { BoardHeader, EmptyState, ErrorState } from '@/shared/components/ui/Board'
import { env } from '@/shared/lib/env'
import {
    allowsTicketmasterLive,
    getProviderModeLabel,
    isAllMode,
    isTicketmasterMode,
} from '@/shared/lib/provider-policy'
import { PAGE_SIZES, DEBOUNCE_MS } from '@/shared/lib/constants'

/** The live fact on the board: tonight's date, in the room's own vernacular. */
function todayStrip(city: string): string {
    const now = new Date()
    const date = now
        .toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        })
        .replace(',', '')
    return city ? `${date} · ${city}` : date
}

export function DiscoverPage() {
    const { user } = useAuth()

    // City, search and page live in the URL, so "gigs in Manchester next page"
    // is a link you can send someone. The text input keeps its own state so
    // typing stays cheap; only the debounced value reaches the URL.
    const [searchParams, setSearchParams] = useSearchParams()
    const city = searchParams.get('city') ?? ''
    const debouncedQuery = searchParams.get('q') ?? ''
    const page = Math.max(1, Number(searchParams.get('page')) || 1)

    const [searchQuery, setSearchQuery] = useState(debouncedQuery)

    const applyParams = (next: { city?: string; q?: string; page?: number }) => {
        const merged = {
            city: next.city ?? city,
            q: next.q ?? debouncedQuery,
            page: next.page ?? page,
        }
        const params: Record<string, string> = {}
        if (merged.city) params.city = merged.city
        if (merged.q) params.q = merged.q
        if (merged.page > 1) params.page = String(merged.page)
        setSearchParams(params, { replace: true })
    }

    const { data, isLoading, error, refetch } = useEvents({
        city,
        query: debouncedQuery,
        page,
        pageSize: PAGE_SIZES.EVENTS,
    })

    const { data: friendsGoing } = useFriendsGoing(data?.data.map(event => event.id) ?? [])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            if (searchQuery !== debouncedQuery) {
                applyParams({ q: searchQuery, page: 1 })
            }
        }, DEBOUNCE_MS.SEARCH)

        return () => window.clearTimeout(timeoutId)
        // applyParams is derived from the same params this effect reads.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, debouncedQuery])

    const setPage = (updater: (p: number) => number) => {
        applyParams({ page: updater(page) })
    }

    const setCity = (newCity: string) => {
        applyParams({ city: newCity, page: 1 })
    }

    const handleCityChange = (newCity: string) => {
        setCity(newCity)
    }

    const clearFilters = () => {
        setSearchQuery('')
        setSearchParams({}, { replace: true })
    }

    const hasActiveFilters = Boolean(city || debouncedQuery)
    const isTicketmasterOnly = isTicketmasterMode()
    const isMixedMode = isAllMode()
    const hasTicketmasterKey = Boolean(env.TICKETMASTER_API_KEY?.trim())
    const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZES.EVENTS)) : 1

    const emptyBody = hasActiveFilters
        ? 'Nothing matches those filters. Widen the city or clear the search.'
        : isTicketmasterOnly
            ? hasTicketmasterKey
                ? 'The database had no matching rows and the live Ticketmaster lookup came back empty.'
                : 'No Ticketmaster events are loaded, and live lookup is switched off.'
            : isMixedMode
                ? 'None of the configured sources returned an event.'
                : 'The demo catalogue has nothing matching.'

    return (
        <div className="page page-body">
            <BoardHeader
                strip={todayStrip(city)}
                title="What's on"
                lede={
                    user
                        ? 'Upcoming gigs, soonest first. Been to one? Open it and log the night.'
                        : 'Upcoming gigs, soonest first. Sign in to keep a record of the ones you go to.'
                }
            >
                <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
                    <CitySelector value={city} onChange={handleCityChange} />

                    <div className="relative">
                        <label htmlFor="event-search" className="sr-only">
                            Search artists, venues and gigs
                        </label>
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-faint"
                            aria-hidden="true"
                        />
                        <input
                            id="event-search"
                            type="search"
                            autoComplete="off"
                            spellCheck={false}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Artist, venue or gig"
                            className="input-field h-full pl-9"
                        />
                    </div>
                </div>

                {hasActiveFilters && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <span className="voice-label text-bone-faint">Filtering by</span>
                        {city && (
                            <button
                                type="button"
                                onClick={() => setCity('')}
                                className="strip-quiet hover:text-bone hover:border-bone-faint transition-colors duration-150 ease-board"
                            >
                                {city}
                                <X className="w-3 h-3" aria-hidden="true" />
                                <span className="sr-only">Remove city filter</span>
                            </button>
                        )}
                        {debouncedQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('')
                                    applyParams({ q: '', page: 1 })
                                }}
                                className="strip-quiet hover:text-bone hover:border-bone-faint transition-colors duration-150 ease-board"
                            >
                                “{debouncedQuery}”
                                <X className="w-3 h-3" aria-hidden="true" />
                                <span className="sr-only">Remove search filter</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="voice-label px-1 text-bone-faint underline hover:text-bone"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </BoardHeader>

            <div className="grid gap-8 lg:gap-10 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <div className="flex items-baseline justify-between gap-4 mb-3">
                        <h2 className="voice-label text-bone-dim">
                            {city ? `Gigs in ${city}` : 'All upcoming gigs'}
                        </h2>
                        {data && !isLoading && (
                            <p className="voice-label text-bone-faint tnum" aria-live="polite">
                                {data.count} {data.count === 1 ? 'gig' : 'gigs'}
                            </p>
                        )}
                    </div>

                    {error && (
                        <ErrorState
                            title="Couldn't load the listings"
                            body="The gig list didn't come back. Your filters are still set — try again."
                            onRetry={() => refetch()}
                        />
                    )}

                    {isLoading && <RowSkeletonList count={6} />}

                    {!isLoading && !error && data?.data.length === 0 && (
                        <EmptyState
                            title="Nothing on the board"
                            body={emptyBody}
                            action={
                                hasActiveFilters ? (
                                    <Button variant="secondary" onClick={clearFilters}>
                                        Clear filters
                                    </Button>
                                ) : (
                                    <p className="voice-label text-bone-faint">
                                        Source: {getProviderModeLabel()}
                                    </p>
                                )
                            }
                        />
                    )}

                    {!isLoading && !error && data && data.data.length > 0 && (
                        <>
                            <div className="rail-list">
                                {data.data.map(event => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        friendsGoing={friendsGoing?.get(event.id)}
                                    />
                                ))}
                            </div>

                            {(data.hasMore || page > 1) && (
                                <nav
                                    aria-label="Listing pages"
                                    className="mt-4 flex items-center justify-between gap-4"
                                >
                                    <Button
                                        variant="secondary"
                                        onClick={() => setPage(p => p - 1)}
                                        disabled={page === 1}
                                    >
                                        Earlier
                                    </Button>
                                    <p className="voice-label text-bone-faint tnum">
                                        Page {page} of {totalPages}
                                    </p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={!data.hasMore}
                                    >
                                        Later
                                    </Button>
                                </nav>
                            )}
                        </>
                    )}

                    {!isLoading && data?.data.length === 0 && (isTicketmasterOnly || isMixedMode) && (
                        <details className="mt-4 border border-rail bg-board">
                            <summary className="cursor-pointer px-4 py-2.5 voice-label text-bone-dim hover:text-bone">
                                Why is this empty?
                            </summary>
                            <div className="px-4 pb-4 space-y-3 text-ui-sm text-bone-dim">
                                {isTicketmasterOnly ? (
                                    <>
                                        <p>
                                            Ticketmaster mode reads your Supabase rows first, matching{' '}
                                            <code translate="no" className="voice-data text-strip">provider = ticketmaster</code>.
                                            An empty project returns nothing.
                                        </p>
                                        <p>
                                            Run{' '}
                                            <code translate="no" className="voice-data text-bone bg-groove px-1.5 py-0.5">
                                                npm run jobs:ingest
                                            </code>{' '}
                                            from the repo root with{' '}
                                            <code translate="no" className="voice-data text-strip">TICKETMASTER_API_KEY</code>,{' '}
                                            <code translate="no" className="voice-data text-strip">SUPABASE_URL</code> and{' '}
                                            <code translate="no" className="voice-data text-strip">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
                                            configured in <code translate="no" className="voice-data text-strip">packages/jobs</code>.
                                        </p>
                                        {allowsTicketmasterLive() && (
                                            <p>
                                                For live browser lookups when the database is empty, set{' '}
                                                <code translate="no" className="voice-data text-strip">VITE_TICKETMASTER_API_KEY</code>{' '}
                                                in <code translate="no" className="voice-data text-strip">apps/web/.env.local</code>.
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p>
                                        Mixed mode reads every provider row in Supabase, then falls back to
                                        live Ticketmaster and the demo catalogue. An empty result means none
                                        of those three matched.
                                    </p>
                                )}
                            </div>
                        </details>
                    )}
                </div>

                <div className="space-y-8">
                    <RecommendedEventsSection limit={4} />
                    <NearbyVenuesSection />
                </div>
            </div>

            <div className="mt-10">
                <TrendingEventsSection limit={6} />
            </div>
        </div>
    )
}
