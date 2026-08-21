import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRecommendedEvents } from '../api/discovery'
import { useFriendsGoing } from '@/features/events/api/useFriendsGoing'
import { EventCard } from '@/features/events/components/EventCard'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'

interface RecommendedEventsSectionProps {
    limit?: number
}

const reasonLabels: Record<string, string> = {
    followed_artist: 'You follow them',
    followed_venue: 'You follow this room',
    preferred_city: 'Your city',
    trending: 'Being logged a lot',
}

function Heading({ children }: { children: React.ReactNode }) {
    return <h2 className="voice-label text-bone-dim mb-3">{children}</h2>
}

export function RecommendedEventsSection({ limit = 8 }: RecommendedEventsSectionProps) {
    const { user } = useAuth()
    // No `= []` default: a failed query must surface as an error state, not
    // silently hide the section (audit finding A13).
    const { data: recommendationsData, isLoading, isError, refetch } = useRecommendedEvents(limit)
    const recommendations = recommendationsData ?? []
    const { data: friendsGoing } = useFriendsGoing(recommendations.map(({ event }) => event.id))

    if (!user) return null

    if (isLoading) {
        return (
            <section>
                <Heading>Picked for you</Heading>
                <RowSkeletonList count={3} label="Loading your recommendations" />
            </section>
        )
    }

    if (isError) {
        return (
            <section>
                <Heading>Picked for you</Heading>
                <QueryErrorState
                    title="Couldn't load your recommendations"
                    onRetry={() => refetch()}
                />
            </section>
        )
    }

    if (recommendations.length === 0) return null

    return (
        <section>
            <Heading>Picked for you</Heading>
            <div className="rail-list">
                {recommendations.map(({ event, reason }) => (
                    <div key={event.id} className="relative">
                        <EventCard event={event} friendsGoing={friendsGoing?.get(event.id)} />
                        <span className="pointer-events-none absolute right-3 top-2 voice-label text-bone-faint">
                            {reasonLabels[reason] || reason}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    )
}
