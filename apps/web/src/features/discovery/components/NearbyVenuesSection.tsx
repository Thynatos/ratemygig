import { Link } from 'react-router-dom'
import { useNearbyVenues } from '../api/discovery'
import { useGeolocation } from '@/shared/hooks/useGeolocation'
import { Button } from '@/shared/components/ui/Button'
import { Skeleton } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { sanitizeText } from '@/shared/lib/sanitize'

function Frame({ children }: { children: React.ReactNode }) {
    return (
        <section className="border border-rail bg-board">
            <h2 className="voice-label text-bone-dim px-4 py-2.5 border-b border-rail">
                Rooms near you
            </h2>
            {children}
        </section>
    )
}

export function NearbyVenuesSection() {
    const {
        latitude,
        longitude,
        error,
        isLoading: geoLoading,
        isSupported,
        requestLocation,
    } = useGeolocation()
    // No `= []` default: a failed query must surface as an error state, not
    // silently hide the section (audit finding A13).
    const {
        data: venuesData,
        isLoading: venuesLoading,
        isError: venuesError,
        refetch: refetchVenues,
    } = useNearbyVenues(latitude, longitude)
    const venues = venuesData ?? []

    const hasLocation = latitude !== null && longitude !== null

    if (error === 'Location access was denied') return null
    if (!isSupported) return null

    if (!hasLocation && !geoLoading) {
        return (
            <Frame>
                <div className="p-4">
                    <p className="text-ui-sm text-bone-dim mb-4">
                        Share your location and this lists the venues closest to you, nearest
                        first.
                    </p>
                    <Button variant="secondary" size="sm" onClick={requestLocation}>
                        Use my location
                    </Button>
                </div>
            </Frame>
        )
    }

    if (geoLoading || venuesLoading) {
        return (
            <Frame>
                <div className="p-4 space-y-2.5" role="status" aria-label="Finding venues near you">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-8" />
                    ))}
                </div>
            </Frame>
        )
    }

    if (venuesError) {
        return (
            <Frame>
                <QueryErrorState
                    title="Couldn't find rooms near you"
                    message="Your location came through but the venue lookup failed."
                    onRetry={() => refetchVenues()}
                />
            </Frame>
        )
    }

    if (venues.length === 0) {
        return (
            <Frame>
                <p className="p-4 text-ui-sm text-bone-dim">
                    No venues on file within reach of you yet.
                </p>
            </Frame>
        )
    }

    return (
        <Frame>
            <ul>
                {venues.slice(0, 8).map((venue, i) => (
                    <li key={venue.id} className={i > 0 ? 'border-t border-rail' : undefined}>
                        <Link
                            to={`/venues/${venue.id}`}
                            className="flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors duration-150 ease-board hover:bg-board-raised"
                        >
                            <span className="min-w-0">
                                <span className="block text-ui text-bone truncate">
                                    {sanitizeText(venue.name)}
                                </span>
                                <span className="block text-ui-sm text-bone-faint truncate">
                                    {sanitizeText(venue.city)}
                                </span>
                            </span>
                            <span className="voice-data text-ui-sm text-bone-dim shrink-0 tabular-nums">
                                {venue.distance_km.toFixed(1)}&nbsp;km
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </Frame>
    )
}
