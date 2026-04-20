import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useTopArtists } from '../api/artists'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Skeleton } from '@/shared/components/ui/Loading'
import { RatingDisplay } from '@/shared/components/ui/StarRating'

export function TopArtistsPage() {
    const yearChoices = useMemo(
        () => Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i),
        []
    )
    const [year, setYear] = useState<number | ''>('')
    const [city, setCity] = useState('')

    const { data: artists = [], isLoading } = useTopArtists(
        city.trim() || undefined,
        year === '' ? undefined : year,
    )

    return (
        <div className="page-container">
            <div className="mb-8">
                <h1 className="section-title flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-400" />
                    Top Rated Artists
                </h1>
                <p className="section-subtitle">Artists ranked by average review rating</p>
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

            {!isLoading && artists.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Trophy className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No rated artists yet</h3>
                        <p className="text-surface-400">
                            Artists will appear here once they receive reviews
                        </p>
                    </CardContent>
                </Card>
            )}

            {!isLoading && artists.length > 0 && (
                <div className="space-y-4">
                    {artists.map((artist, index) => (
                        <Link key={artist.artist_id} to={`/artists/${artist.artist_id}`}>
                            <Card hoverable>
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-400 font-bold text-lg">
                                                {index + 1}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-500/30 to-primary-500/30 flex items-center justify-center text-xl font-bold text-white">
                                                    {artist.artist_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg text-white">
                                                        {artist.artist_name}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <RatingDisplay
                                                rating={Number(artist.avg_rating)}
                                                count={Number(artist.count_reviews)}
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