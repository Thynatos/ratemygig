import { MapPin, Navigation } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNearbyVenues } from '../api/discovery'
import { useGeolocation } from '@/shared/hooks/useGeolocation'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Loading'
import { sanitizeText } from '@/shared/lib/sanitize'

export function NearbyVenuesSection() {
    const { latitude, longitude, error, isLoading: geoLoading, isSupported, requestLocation } = useGeolocation()
    const { data: venues = [], isLoading: venuesLoading } = useNearbyVenues(latitude, longitude)

    const hasLocation = latitude !== null && longitude !== null

    if (error === 'Location access was denied') return null

    if (!isSupported) return null

    if (!hasLocation && !geoLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-accent-400" />
                        <h3 className="text-lg font-semibold text-white">Venues Near You</h3>
                    </div>
                    <p className="text-surface-400 text-sm mb-4">
                        Enable location to find venues nearby
                    </p>
                    <Button variant="secondary" size="sm" onClick={requestLocation}>
                        <Navigation className="w-4 h-4 mr-2" />
                        Enable Location
                    </Button>
                </CardContent>
            </Card>
        )
    }

    if (geoLoading || venuesLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-accent-400" />
                        <h3 className="text-lg font-semibold text-white">Venues Near You</h3>
                    </div>
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (venues.length === 0) return null

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <MapPin className="w-5 h-5 text-accent-400" />
                    <h3 className="text-lg font-semibold text-white">Venues Near You</h3>
                </div>
                <div className="space-y-2">
                    {venues.slice(0, 8).map(venue => (
                        <Link
                            key={venue.id}
                            to={`/venues/${venue.id}`}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-800 transition-colors"
                        >
                            <div>
                                <div className="font-medium text-white text-sm">{sanitizeText(venue.name)}</div>
                                <div className="text-xs text-surface-400">{sanitizeText(venue.city)}</div>
                            </div>
                            <span className="text-xs text-surface-500">{venue.distance_km.toFixed(1)} km</span>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}