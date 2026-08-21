import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTopVenues } from '../api/venues'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
import { Leaderboard, LeaderboardFilters } from '@/shared/components/Leaderboard'
import { sanitizeText } from '@/shared/lib/sanitize'
import { cn } from '@/shared/lib/utils'

export function TopVenuesPage() {
    const yearChoices = useMemo(
        () => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i),
        []
    )
    const [year, setYear] = useState<number | ''>('')
    const [city, setCity] = useState('')
    const { pathname } = useLocation()

    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no rated venues yet" (audit finding A13).
    const {
        data: venuesData,
        isLoading,
        isError,
        refetch,
    } = useTopVenues(city.trim() || undefined, year === '' ? undefined : year)
    const venues = venuesData ?? []

    const entries = venues.map(venue => ({
        id: venue.venue_id,
        name: sanitizeText(venue.venue_name),
        meta: sanitizeText(venue.city),
        avgRating: Number(venue.avg_rating),
        countReviews: Number(venue.count_reviews),
        // get_venue_rating_summary's leaderboard shape returns no per-star
        // buckets, so the row shows no distribution rather than a fabricated one.
    }))

    const scope = [year === '' ? null : String(year), city.trim() || null]
        .filter(Boolean)
        .join(' · ')

    return (
        <div className="page page-body">
            <BoardHeader
                strip={scope || 'All time · everywhere'}
                title="Top rated venues"
                lede="Rooms ranked by the average score of every gig logged there. A venue is half the night."
            >
                <div className="tab-rail mb-4">
                    <Link to="/venues" className={cn('tab', pathname === '/venues' && 'tab-active')}>
                        All venues
                    </Link>
                    <Link
                        to="/venues/top"
                        className={cn('tab', pathname === '/venues/top' && 'tab-active')}
                        aria-current={pathname === '/venues/top' ? 'page' : undefined}
                    >
                        Top rated
                    </Link>
                </div>

                <LeaderboardFilters
                    year={year}
                    onYearChange={setYear}
                    city={city}
                    onCityChange={setCity}
                    yearChoices={yearChoices}
                />
            </BoardHeader>

            {isLoading && <RowSkeletonList count={6} label="Ranking venues" />}

            {!isLoading && isError && (
                <QueryErrorState
                    title="Couldn't rank the venues"
                    message="The ratings query failed. Your filters are still set."
                    onRetry={() => refetch()}
                />
            )}

            {!isLoading && !isError && entries.length === 0 && (
                <EmptyState
                    title="Nothing to rank yet"
                    body={
                        scope
                            ? 'No venue has a rated gig matching those filters. Try a wider year or clear the city.'
                            : 'A venue joins this table once someone rates a gig held there.'
                    }
                    action={
                        <Link to="/venues" className="btn-secondary">
                            Browse all venues
                        </Link>
                    }
                />
            )}

            {!isLoading && !isError && entries.length > 0 && (
                <Leaderboard entries={entries} hrefPrefix="/venues" />
            )}
        </div>
    )
}
