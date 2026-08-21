import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy, MapPin } from 'lucide-react'
import { useTopVenues } from '../api/venues'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Skeleton } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { RatingDisplay } from '@/shared/components/ui/StarRating'
import { sanitizeText } from '@/shared/lib/sanitize'

export function TopVenuesPage() {
    const yearChoices = useMemo(
        () => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i),
        []
    )
    const [year, setYear] = useState<number | ''>('')
    const [city, setCity] = useState('')

    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no rated venues yet" (audit finding A13).
    const { data: venuesData, isLoading, isError, refetch } = useTopVenues(
        city.trim() || undefined,
        year === '' ? undefined : year,
    )
    const venues = venuesData ?? []

    return (
        <div className="page-container">
            <div className="mb-8">
                <h1 className="section-title flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                    Top Rated Venues
                </h1>
                <p className="section-subtitle">Venues ranked by average review rating</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <select
                    value={year === '' ? '' : String(year)}
                    onChange={e => {
                        const v = e.target.value
                        setYear(v === '' ? '' : Number(v))
                    }}
                    className="input-field w-full sm:w-48"
                >
                    <option value="">All years</option>
                    {yearChoices.map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Filter by city..."
                    className="input-field flex-1"
                />
            </div>

            {isLoading && (
                <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-5">
                                <Skeleton className="h-6 w-1/3 mb-2" />
                                <Skeleton className="h-4 w-1/4 mb-2" />
                                <Skeleton className="h-4 w-1/5" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {!isLoading && isError && (
                <QueryErrorState
                    title="Couldn't load top venues"
                    onRetry={() => refetch()}
                />
            )}

            {!isLoading && !isError && venues.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Trophy className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No rated venues yet</h3>
                        <p className="text-surface-400">
                            Venues will appear here once they receive reviews
                        </p>
                    </CardContent>
                </Card>
            )}

            {!isLoading && !isError && venues.length > 0 && (
                <div className="space-y-4">
                    {venues.map((venue, index) => (
                        <Link key={venue.venue_id} to={`/venues/${venue.venue_id}`}>
                            <Card hoverable>
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-400 font-bold text-lg">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-lg text-white">
                                                    {sanitizeText(venue.venue_name)}
                                                </h3>
                                                <p className="text-surface-400 flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {sanitizeText(venue.city)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <RatingDisplay
                                                rating={Number(venue.avg_rating)}
                                                count={Number(venue.count_reviews)}
                                                size="sm"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}