import { Sparkles } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useRecommendedEvents } from '../api/discovery'
import { useFriendsGoing } from '@/features/events/api/useFriendsGoing'
import { EventCard } from '@/features/events/components/EventCard'
import { Skeleton } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'

interface RecommendedEventsSectionProps {
    limit?: number
}

const reasonLabels: Record<string, string> = {
    followed_artist: 'Because you follow this artist',
    followed_venue: 'Because you follow this venue',
    preferred_city: 'In your preferred city',
    trending: 'Trending',
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
                <h2 className="section-title mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-accent-400" />
                    Recommended For You
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => (
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
                    <Sparkles className="w-6 h-6 text-accent-400" />
                    Recommended For You
                </h2>
                <QueryErrorState
                    title="Couldn't load recommendations"
                    onRetry={() => refetch()}
                />
            </section>
        )
    }

    if (recommendations.length === 0) return null

    return (
        <section>
            <h2 className="section-title mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-accent-400" />
                Recommended For You
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {recommendations.map(({ event, reason }) => (
                    <div key={event.id} className="relative">
                        <EventCard event={event} friendsGoing={friendsGoing?.get(event.id)} />
                        <span className="absolute top-2 right-2 bg-accent-500/20 text-accent-300 border border-accent-500/30 text-xs px-2 py-0.5 rounded-full">
                            {reasonLabels[reason] || reason}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    )
}