import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star, Search } from 'lucide-react'
import { useVenues } from '../api/venues'
import { useCities } from '@/features/events/api/events'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Badge } from '@/shared/components/ui/Badge'
import { Skeleton } from '@/shared/components/ui/Loading'

export function VenuesPage() {
    const [selectedCity, setSelectedCity] = useState<string>('')
    const [searchQuery, setSearchQuery] = useState('')

    const { data: cities = [] } = useCities()
    const { data: venues, isLoading } = useVenues(selectedCity || undefined)

    const filteredVenues = venues?.filter(venue =>
        venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        venue.city.toLowerCase().includes(searchQuery.toLowerCase())
    ) || []

    return (
        <div className="page-container">
            <div className="mb-8">
                <h1 className="section-title flex items-center gap-3">
                    <MapPin className="w-8 h-8 text-primary-400" />
                    Venues
                </h1>
                <p className="section-subtitle">Discover concert venues and their ratings</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search venues..."
                        className="input-field pl-12"
                    />
                </div>

                {/* City Filter */}
                <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="input-field w-full sm:w-48"
                >
                    <option value="">All Cities</option>
                    {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="p-5">
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-1/2 mb-4" />
                                <Skeleton className="h-4 w-1/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredVenues.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <MapPin className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No venues found</h3>
                        <p className="text-surface-400">
                            {searchQuery || selectedCity
                                ? 'Try adjusting your filters'
                                : 'Venues will appear here as events are added'}
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Venues Grid */}
            {!isLoading && filteredVenues.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredVenues.map(venue => (
                        <Link key={venue.id} to={`/venues/${venue.id}`}>
                            <Card hoverable>
                                <CardContent className="p-5">
                                    <h3 className="font-semibold text-lg text-white mb-1">
                                        {venue.name}
                                    </h3>
                                    <p className="text-surface-400 flex items-center gap-1 mb-4">
                                        <MapPin className="w-4 h-4" />
                                        {venue.city}, {venue.country}
                                    </p>

                                    <div className="flex items-center justify-between">
                                        <Badge variant="surface">Venue</Badge>
                                        {/* Rating would come from aggregation */}
                                        <span className="flex items-center gap-1 text-sm text-surface-400">
                                            <Star className="w-4 h-4" />
                                            <span>—</span>
                                        </span>
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
