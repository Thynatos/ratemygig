import { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useFollowerCount, useFollowingCount } from '@/features/profile/api/follows'
import { Figure, FigureRail } from '@/shared/components/ui/Board'
import { formatNumber } from '@/shared/lib/utils'

interface GigStatsCardProps {
    userId: string
}

/** Counts stated flatly, in tabular figures (PRODUCT.md §6). */
export const GigStatsCard = memo(function GigStatsCard({ userId }: GigStatsCardProps) {
    const { data: reviewsCount = 0 } = useQuery({
        queryKey: ['stats', 'reviews', userId],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('reviews')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_public', true)
                .eq('status', 'published')

            if (error) throw error
            return count ?? 0
        },
        enabled: !!userId,
    })

    const { data: eventsCount = 0 } = useQuery({
        queryKey: ['stats', 'attendance', userId],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('attendance')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)

            if (error) throw error
            return count ?? 0
        },
        enabled: !!userId,
    })

    const { data: followerCount = 0 } = useFollowerCount(userId)
    const { data: followingCount = 0 } = useFollowingCount(userId)

    return (
        <FigureRail>
            <Figure value={formatNumber(eventsCount)} label="Gigs" accent />
            <Figure value={formatNumber(reviewsCount)} label="Reviews" />
            <Figure value={formatNumber(followerCount)} label="Followers" />
            <Figure value={formatNumber(followingCount)} label="Following" />
        </FigureRail>
    )
})
