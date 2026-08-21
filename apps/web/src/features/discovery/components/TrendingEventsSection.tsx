import { useTrendingEvents } from '../api/discovery'
import { useFriendsGoing } from '@/features/events/api/useFriendsGoing'
import { EventCard } from '@/features/events/components/EventCard'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'

interface TrendingEventsSectionProps {
    limit?: number
}

function Heading({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="voice-label text-bone-dim">{children}</h2>
        </div>
    )
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
                <Heading>Most logged this week</Heading>
                <RowSkeletonList count={3} label="Loading trending gigs" />
            </section>
        )
    }

    if (isError) {
        return (
            <section>
                <Heading>Most logged this week</Heading>
                <QueryErrorState
                    title="Couldn't load what's trending"
                    onRetry={() => refetch()}
                />
            </section>
        )
    }

    if (trending.length === 0) return null

    return (
        <section>
            <Heading>Most logged this week</Heading>
            <div className="rail-list">
                {trending.map(({ event }) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        friendsGoing={friendsGoing?.get(event.id)}
                    />
                ))}
            </div>
        </section>
    )
}
