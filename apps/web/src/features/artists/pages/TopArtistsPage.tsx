import { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTopArtists } from '../api/artists'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
import { Leaderboard, LeaderboardFilters } from '@/shared/components/Leaderboard'
import { sanitizeText } from '@/shared/lib/sanitize'
import { cn } from '@/shared/lib/utils'

export function TopArtistsPage() {
    const yearChoices = useMemo(
        () => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i),
        []
    )
    const [year, setYear] = useState<number | ''>('')
    const [city, setCity] = useState('')
    const { pathname } = useLocation()

    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no rated artists yet" (audit finding A13).
    const {
        data: artistsData,
        isLoading,
        isError,
        refetch,
    } = useTopArtists(city.trim() || undefined, year === '' ? undefined : year)
    const artists = artistsData ?? []

    const entries = artists.map(artist => ({
        id: artist.artist_id,
        name: sanitizeText(artist.artist_name),
        avgRating: Number(artist.avg_rating),
        countReviews: Number(artist.count_reviews),
        // The leaderboard RPC returns no per-star buckets; open the artist for
        // the full distribution rather than showing a fabricated one here.
    }))

    const scope = [year === '' ? null : String(year), city.trim() || null]
        .filter(Boolean)
        .join(' · ')

    return (
        <div className="page page-body">
            <BoardHeader
                strip={scope || 'All time · everywhere'}
                title="Top rated artists"
                lede="Ranked by the average score of every gig of theirs that anyone has logged."
            >
                <div className="tab-rail mb-4">
                    <Link
                        to="/artists"
                        className={cn('tab', pathname === '/artists' && 'tab-active')}
                    >
                        All artists
                    </Link>
                    <Link
                        to="/artists/top"
                        className={cn('tab', pathname === '/artists/top' && 'tab-active')}
                        aria-current={pathname === '/artists/top' ? 'page' : undefined}
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
                    cityLabel="City the gig was in"
                />
            </BoardHeader>

            {isLoading && <RowSkeletonList count={6} label="Ranking artists" />}

            {!isLoading && isError && (
                <QueryErrorState
                    title="Couldn't rank the artists"
                    message="The ratings query failed. Your filters are still set."
                    onRetry={() => refetch()}
                />
            )}

            {!isLoading && !isError && entries.length === 0 && (
                <EmptyState
                    title="Nothing to rank yet"
                    body={
                        scope
                            ? 'No artist has a rated gig matching those filters. Try a wider year or clear the city.'
                            : 'An artist joins this table once someone rates one of their gigs.'
                    }
                    action={
                        <Link to="/artists" className="btn-secondary">
                            Browse all artists
                        </Link>
                    }
                />
            )}

            {!isLoading && !isError && entries.length > 0 && (
                <Leaderboard entries={entries} hrefPrefix="/artists" />
            )}
        </div>
    )
}
