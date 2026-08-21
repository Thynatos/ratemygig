import { TrendingUp } from 'lucide-react'
import { useTrendingEvents } from '../api/discovery'
import { useFriendsGoing } from '@/features/events/api/useFriendsGoing'
import { EventCard } from '@/features/events/components/EventCard'
import { Skeleton } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'

interface TrendingEventsSectionProps {
    limit?: number
}

export function TrendingEventsSection({ limit = 6 }: TrendingEventsSectionProps) {
    // No `= []` default: a failed query must surface as an error state, not
    // silently hide the section (audit finding A13).
    const { data: trendingData, isLoading, isError, refetch } = useTrendingEvents(limit)
    const trending = trendingData ?? []
    const { data: friendsGoing } = useFriendsGoing(trending.map(({ event }) => event.id))

    if (isLoading) {
        return (
            <section>
                <h2 className="section-title mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary-400" />
                    Trending
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-48 rounded-xl" />
                    ))}
                </div>
            </section>
        )
    }

    if (isError) {
        return (
            <section>
                <h2 className="section-title mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-primary-400" />
                    Trending
                </h2>
                <QueryErrorState
                    title="Couldn't load trending events"
                    onRetry={() => refetch()}
                />
            </section>
        )
    }

    if (trending.length === 0) return null

    return (
        <section>
            <h2 className="section-title mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary-400" />
                Trending
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trending.map(({ event }) => (
                    <EventCard key={event.id} event={event} friendsGoing={friendsGoing?.get(event.id)} />
                ))}
            </div>
        </section>
    )
}
