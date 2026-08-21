import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useVenues } from '../api/venues'
import { useCities } from '@/features/events/api/events'
import { Button } from '@/shared/components/ui/Button'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
import { sanitizeText } from '@/shared/lib/sanitize'
import { cn } from '@/shared/lib/utils'

const PAGE_SIZE = 24

export function VenuesPage() {
    const [selectedCity, setSelectedCity] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')
    const [page, setPage] = useState(1)
    const { pathname } = useLocation()

    const { data: cities = [] } = useCities()
    const { data, isLoading } = useVenues(selectedCity || undefined, page, PAGE_SIZE)

    const venues = data?.data ?? []
    const hasMore = data?.hasMore ?? false

    const filteredVenues = venues.filter(
        venue =>
            venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venue.city.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const hasFilters = Boolean(searchQuery || selectedCity)

    return (
        <div className="page page-body">
            <BoardHeader
                title="Venues"
                lede="Every room on the board. The venue is half the night — open one to see how its gigs get rated."
            >
                <div className="tab-rail mb-4">
                    <Link
                        to="/venues"
                        className={cn('tab', pathname === '/venues' && 'tab-active')}
                        aria-current={pathname === '/venues' ? 'page' : undefined}
                    >
                        All venues
                    </Link>
                    <Link
                        to="/venues/top"
                        className={cn('tab', pathname === '/venues/top' && 'tab-active')}
                    >
                        Top rated
                    </Link>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_minmax(0,12rem)] max-w-2xl">
                    <div className="relative">
                        <label htmlFor="venue-search" className="sr-only">
                            Search venues
                        </label>
                        <Search
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-bone-faint"
                            aria-hidden="true"
                        />
                        <input
                            id="venue-search"
                            type="search"
                            autoComplete="off"
                            spellCheck={false}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search rooms or cities"
                            className="input-field pl-9"
                        />
                    </div>

                    <div>
                        <label htmlFor="venue-city" className="sr-only">
                            Filter by city
                        </label>
                        <select
                            id="venue-city"
                            value={selectedCity}
                            onChange={e => {
                                setSelectedCity(e.target.value)
                                setPage(1)
                            }}
                            className="input-field"
                        >
                            <option value="">Every city</option>
                            {cities.map(city => (
                                <option key={city} value={city}>
                                    {city}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </BoardHeader>

            {isLoading && page === 1 && <RowSkeletonList count={8} label="Loading venues" />}

            {!isLoading && filteredVenues.length === 0 && (
                <EmptyState
                    title={hasFilters ? 'No room matches' : 'No venues yet'}
                    body={
                        hasFilters
                            ? 'Nothing matches those filters. Try a wider city or a shorter search.'
                            : 'Venues appear here as gigs are added to the board.'
                    }
                    action={
                        hasFilters ? (
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSearchQuery('')
                                    setSelectedCity('')
                                    setPage(1)
                                }}
                            >
                                Clear filters
                            </Button>
                        ) : (
                            <Link to="/" className="btn-secondary">
                                See what's on
                            </Link>
                        )
                    }
                />
            )}

            {(!isLoading || page > 1) && filteredVenues.length > 0 && (
                <>
                    <ul className="rail-list">
                        {filteredVenues.map(venue => {
                            const name = sanitizeText(venue.name)
                            return (
                                <li key={venue.id}>
                                    <Link to={`/venues/${venue.id}`} className="row row-interactive">
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
                                            <span className="row-meta">
                                                {sanitizeText(venue.city)},{' '}
                                                {sanitizeText(venue.country)}
                                            </span>
                                        </span>
                                        <span className="row-end">
                                            <span className="voice-label text-bone-faint">
                                                View
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>

                    {hasMore && (
                        <div className="mt-4">
                            <Button
                                variant="secondary"
                                onClick={() => setPage(p => p + 1)}
                                isLoading={isLoading && page > 1}
                                loadingLabel="Loading more venues"
                            >
                                Show more venues
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
