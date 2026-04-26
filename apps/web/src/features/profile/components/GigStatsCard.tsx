import { memo } from 'react'
import { Star, Calendar, Users, Heart } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useFollowerCount, useFollowingCount } from '@/features/profile/api/follows'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { formatNumber } from '@/shared/lib/utils'

interface GigStatsCardProps {
    userId: string
}

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

    const stats = [
        { icon: Star, label: 'Reviews', value: reviewsCount, color: 'text-yellow-400' },
        { icon: Calendar, label: 'Events', value: eventsCount, color: 'text-primary-400' },
        { icon: Users, label: 'Followers', value: followerCount, color: 'text-accent-400' },
        { icon: Heart, label: 'Following', value: followingCount, color: 'text-pink-400' },
    ]

    return (
        <Card>
            <CardContent className="p-4">
                <div className="grid grid-cols-4 gap-3">
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <stat.icon className={stat.color + ' w-5 h-5 mx-auto mb-1'} />
                            <div className="text-lg font-bold text-white">
                                {formatNumber(stat.value)}
                            </div>
                            <div className="text-xs text-surface-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
})
