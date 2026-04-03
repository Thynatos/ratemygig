import { useEffect, useState } from 'react'
import { Search, Calendar, SlidersHorizontal, X } from 'lucide-react'
import { useEvents } from '../api/events'
import { EventCard } from '../components/EventCard'
import { CitySelector } from '../components/CitySelector'
import { Button } from '@/shared/components/ui/Button'
import { EventCardSkeleton } from '@/shared/components/ui/Loading'
import { env } from '@/shared/lib/env'
import { allowsTicketmasterLive, getProviderModeLabel, isAllMode, isTicketmasterMode } from '@/shared/lib/provider-policy'
import { cn } from '@/shared/lib/utils'

export function DiscoverPage() {
    const [city, setCity] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const [page, setPage] = useState(1)
    const [showFilters, setShowFilters] = useState(false)

    const { data, isLoading, error } = useEvents({
        city,
        query: debouncedQuery,
        page,
        pageSize: 12,
    })

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedQuery(searchQuery)
            setPage(1)
        }, 300)

        return () => window.clearTimeout(timeoutId)
    }, [searchQuery])

    const handleCityChange = (newCity: string) => {
        setCity(newCity)
        setPage(1)
    }

    const clearFilters = () => {
        setSearchQuery('')
        setDebouncedQuery('')
        setCity('')
        setPage(1)
    }

    const hasActiveFilters = city || debouncedQuery
    const isTicketmasterOnly = isTicketmasterMode()
    const isMixedMode = isAllMode()
    const hasTicketmasterKey = Boolean(env.TICKETMASTER_API_KEY?.trim())

    const emptyStateDescription = hasActiveFilters
        ? 'Try adjusting your filters or search query.'
        : isTicketmasterOnly
          ? hasTicketmasterKey
              ? 'No Ticketmaster events matched this search. The app checked your DB first, then the live Ticketmaster API.'
              : 'No Ticketmaster events are available. Add DB rows or set VITE_TICKETMASTER_API_KEY to enable live fallback.'
          : isMixedMode
            ? 'No events were found across your configured providers.'
            : 'No demo events matched this search.'

    return (
        <div className="page-container">
            {/* Hero Section */}
            <section className="text-center py-12 md:py-16">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-4">
                    Discover <span className="text-gradient">Amazing Gigs</span>
                </h1>
                <p className="text-lg text-surface-400 max-w-2xl mx-auto mb-8">
                    Find upcoming concerts, get tickets, and share your experiences with the community.
                </p>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <CitySelector value={city} onChange={handleCityChange} />

                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search artists, venues, events..."
                                className="input-field pl-12 pr-4"
                            />
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(showFilters && 'border-primary-500')}
                        >
                            <SlidersHorizontal className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Active Filters */}
                    {hasActiveFilters && (
                        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                            <span className="text-sm text-surface-400">Active filters:</span>
                            {city && (
                                <button
                                    onClick={() => setCity('')}
                                    className="badge-primary flex items-center gap-1"
                                >
                                    {city}
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            {debouncedQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setDebouncedQuery('') }}
                                    className="badge-accent flex items-center gap-1"
                                >
                                    "{debouncedQuery}"
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                            <button
                                onClick={clearFilters}
                                className="text-sm text-surface-500 hover:text-surface-300"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Results */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="section-title flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-primary-400" />
                        Upcoming Events
                    </h2>
                    {data && (
                        <span className="text-surface-400">
                            {data.count} {data.count === 1 ? 'event' : 'events'} found
                        </span>
                    )}
                </div>

                {/* Error State */}
                {error && (
                    <div className="glass-card p-8 text-center">
                        <p className="text-red-400 mb-4">Failed to load events</p>
                        <Button variant="secondary" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <EventCardSkeleton key={i} />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && data?.data.length === 0 && (
                    <div className="glass-card p-12 text-center">
                        <Calendar className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No events found</h3>
                        {isTicketmasterOnly && (
                            <div className="mb-6 max-w-2xl mx-auto rounded-xl border border-surface-600 bg-surface-800/40 p-4 text-left text-sm text-surface-300 space-y-2">
                                <p className="font-medium text-surface-200">
                                    Ticketmaster mode checks your Supabase database first (rows with{' '}
                                    <code className="text-primary-300">provider = ticketmaster</code>). If this
                                    project is empty, sync Ticketmaster data into Supabase or enable browser-side live fallback.
                                </p>
                                <p>
                                    From the repo root, run{' '}
                                    <code className="rounded bg-surface-900 px-1.5 py-0.5 text-surface-100">
                                        npm run jobs:ingest
                                    </code>
                                    . Configure <code className="text-primary-300">packages/jobs</code> with{' '}
                                    <code className="text-primary-300">TICKETMASTER_API_KEY</code>,{' '}
                                    <code className="text-primary-300">SUPABASE_URL</code>, and{' '}
                                    <code className="text-primary-300">SUPABASE_SERVICE_ROLE_KEY</code> (see root{' '}
                                    <code className="text-primary-300">.env.example</code>).
                                </p>
                                {allowsTicketmasterLive() && (
                                    <p>
                                        To query Ticketmaster directly in the browser when the DB has no rows, set{' '}
                                        <code className="text-primary-300">VITE_TICKETMASTER_API_KEY</code> in{' '}
                                        <code className="text-primary-300">apps/web/.env.local</code>.
                                    </p>
                                )}
                            </div>
                        )}
                        {isMixedMode && (
                            <div className="mb-6 max-w-2xl mx-auto rounded-xl border border-surface-600 bg-surface-800/40 p-4 text-left text-sm text-surface-300 space-y-2">
                                <p className="font-medium text-surface-200">
                                    Mixed mode reads all provider rows from Supabase first, then can fall back to live Ticketmaster and demo data when nothing matches.
                                </p>
                                <p>
                                    This helps during setup, but an empty result still means none of the configured sources produced matching events.
                                </p>
                            </div>
                        )}
                        <p className="text-surface-400 mb-6">
                            {emptyStateDescription}
                        </p>
                        {hasActiveFilters && (
                            <Button variant="secondary" onClick={clearFilters}>
                                Clear Filters
                            </Button>
                        )}
                        {!hasActiveFilters && (
                            <p className="text-xs uppercase tracking-[0.2em] text-surface-500">
                                Current source: {getProviderModeLabel()}
                            </p>
                        )}
                    </div>
                )}

                {/* Events Grid */}
                {!isLoading && data && data.data.length > 0 && (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {data.data.map(event => (
                                <EventCard key={event.id} event={event} />
                            ))}
                        </div>

                        {/* Pagination */}
                        {(data.hasMore || page > 1) && (
                            <div className="mt-8 flex items-center justify-center gap-4">
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage(p => p - 1)}
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-surface-400">
                                    Page {page} of {Math.ceil(data.count / 12)}
                                </span>
                                <Button
                                    variant="secondary"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={!data.hasMore}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}
