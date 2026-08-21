import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { User, Star, Calendar, Globe } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Badge } from '@/shared/components/ui/Badge'
import { RatingDisplay } from '@/shared/components/ui/StarRating'
import { LoadingPage } from '@/shared/components/ui/Loading'
import { Button } from '@/shared/components/ui/Button'
import { GigStatsCard } from '../components/GigStatsCard'
import { formatDate, formatRelativeTime, cn } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import { FollowUserButton, FollowerCounts } from '../components/FollowUserButton'
import type { Profile } from '@core/index'

type TabType = 'reviews' | 'lists'

interface PublicListRow {
    id: string
    name: string
    description: string | null
    created_at: string
    list_items: { count: number }[]
}

export function PublicProfilePage() {
    const { username } = useParams<{ username: string }>()
    const [activeTab, setActiveTab] = useState<TabType>('reviews')

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['public-profile', username],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .eq('is_profile_public', true)
                .single()

            if (error) throw error
            return data as Profile
        },
        enabled: !!username,
    })

    const { data: reviews = [] } = useQuery({
        queryKey: ['user-public-reviews', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          event:events(*,venue:venues(*))
        `)
                .eq('user_id', profile!.id)
                .eq('is_public', true)
                .eq('status', 'published')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data
        },
        enabled: !!profile?.id,
    })

    const { data: lists = [] } = useQuery({
        queryKey: ['user-public-lists', profile?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lists')
                .select('*, list_items(count)')
                .eq('user_id', profile!.id)
                .eq('is_public', true)
                .order('created_at', { ascending: false })

            if (error) throw error

            return ((data ?? []) as PublicListRow[]).map((row) => ({
                ...row,
                item_count: row.list_items?.[0]?.count ?? 0,
            }))
        },
        enabled: !!profile?.id,
    })

    if (profileLoading) return <LoadingPage message="Loading profile..." />

    if (!profile) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <User className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">Profile not found</h2>
                        <p className="text-surface-400 mb-6">
                            This profile may be private or doesn't exist.
                        </p>
                        <Link to="/">
                            <Button variant="secondary">Discover Events</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const showListsTab = lists.length > 0

    return (
        <div className="page-container max-w-4xl mx-auto">
            <Card className="mb-8">
                <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <Avatar
                            src={profile.avatar_url}
                            name={sanitizeText(profile.display_name || profile.username || 'Anonymous')}
                            size="xl"
                        />
                        <div className="text-center md:text-left flex-1">
                            <h1 className="text-3xl font-display font-bold text-white mb-1">
                                {sanitizeText(profile.display_name || profile.username || 'Anonymous')}
                            </h1>
                            {profile.username && (
                                <p className="text-surface-400 mb-3">@{sanitizeText(profile.username)}</p>
                            )}
                            {profile.bio && (
                                <p className="text-surface-300 max-w-xl">{sanitizeText(profile.bio)}</p>
                            )}

                            {(profile.website_url || profile.twitter_handle || profile.instagram_handle) && (
                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                    {profile.website_url && (
                                        <a
                                            href={profile.website_url.startsWith('http') ? profile.website_url : `https://${profile.website_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                                        >
                                            <Globe className="w-4 h-4" />
                                            Website
                                        </a>
                                    )}
                                    {profile.twitter_handle && (
                                        <a
                                            href={`https://twitter.com/${profile.twitter_handle}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-sky-400 hover:text-sky-300 transition-colors"
                                        >
                                            @{sanitizeText(profile.twitter_handle)}
                                        </a>
                                    )}
                                    {profile.instagram_handle && (
                                        <a
                                            href={`https://instagram.com/${profile.instagram_handle}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-pink-400 hover:text-pink-300 transition-colors"
                                        >
                                            @{sanitizeText(profile.instagram_handle)}
                                        </a>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 flex items-center justify-center md:justify-start gap-4">
                                <Badge variant="primary">
                                    {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                                </Badge>
                                <FollowerCounts userId={profile.id} />
                            </div>
                            <div className="mt-4">
                                <FollowUserButton userId={profile.id} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="mb-6">
                <GigStatsCard userId={profile.id} />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-surface-800 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('reviews')}
                    className={cn(
                        'tab flex items-center gap-1.5',
                        activeTab === 'reviews' && 'active'
                    )}
                >
                    <Star className="w-4 h-4" />
                    Reviews
                </button>
                {showListsTab && (
                    <button
                        onClick={() => setActiveTab('lists')}
                        className={cn(
                            'tab flex items-center gap-1.5',
                            activeTab === 'lists' && 'active'
                        )}
                    >
                        <Globe className="w-4 h-4" />
                        Lists ({lists.length})
                    </button>
                )}
            </div>

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
                <section>
                    {reviews.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Star className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                                <p className="text-surface-400">No public reviews yet</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <Card key={review.id}>
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                {review.event && (
                                                    <Link
                                                        to={`/events/${review.event.id}`}
                                                        className="font-semibold text-white hover:text-primary-400 transition-colors"
                                                    >
                                                        {review.event.name}
                                                    </Link>
                                                )}
                                                <div className="flex items-center gap-3 mt-1 text-sm text-surface-400">
                                                    {review.event && (
                                                        <>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {formatDate(review.event.start_at, 'MMM d, yyyy')}
                                                            </span>
                                                            {review.event.venue && (
                                                                <span>
                                                                    {review.event.venue.name}, {review.event.city}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <RatingDisplay rating={review.rating} />
                                        </div>

                                        {review.title && (
                                            <p className="mt-3 font-medium text-white">&ldquo;{sanitizeText(review.title)}&rdquo;</p>
                                        )}

                                        <p className="mt-2 text-surface-300 line-clamp-3">{sanitizeText(review.body)}</p>

                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-sm text-surface-500">
                                                {formatRelativeTime(review.created_at)}
                                            </span>
                                            <Link
                                                to={`/r/${review.id}`}
                                                className="text-sm text-primary-400 hover:text-primary-300"
                                            >
                                                Read more →
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Lists Tab */}
            {activeTab === 'lists' && (
                <section>
                    {lists.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <Globe className="w-12 h-12 text-surface-600 mx-auto mb-4" />
                                <p className="text-surface-400">No public lists yet</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {lists.map((list) => (
                                <Link key={list.id} to={`/lists/${list.id}`}>
                                    <Card hoverable>
                                        <CardContent className="p-5">
                                            <h3 className="font-semibold text-white">{sanitizeText(list.name)}</h3>
                                            {list.description && (
                                                <p className="text-sm text-surface-400 mt-1">{sanitizeText(list.description)}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-3">
                                                <Badge variant="surface">
                                                    {list.item_count} {list.item_count === 1 ? 'event' : 'events'}
                                                </Badge>
                                                <span className="text-xs text-surface-500">
                                                    {formatRelativeTime(list.created_at)}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}
