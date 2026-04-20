import { useState } from 'react'
import { Rss, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActivityFeed } from '../api/feed'
import { FeedCard } from '../components/FeedCard'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { EventCardSkeleton } from '@/shared/components/ui/Loading'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function FeedPage() {
    const { user } = useAuth()
    const [page, setPage] = useState(1)
    const { data: result, isLoading } = useActivityFeed(page)

    const items = result?.items ?? []
    const hasMore = result?.hasMore ?? false
    const hasErrors = result?.hasErrors ?? false

    if (!user) {
        return (
            <div className="page-container">
                <Card>
                    <CardContent className="p-12 text-center">
                        <Rss className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">Sign in to see your feed</h3>
                        <p className="text-surface-400 mb-6">Follow artists, venues, and users to get personalized updates</p>
                        <Link to="/login">
                            <Button>Sign In</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="section-title flex items-center gap-3">
                        <Rss className="w-8 h-8 text-primary-400" />
                        Activity Feed
                    </h1>
                    <p className="section-subtitle">Updates from artists, venues, and people you follow</p>
                </div>
            </div>

            {/* Partial error banner */}
            {hasErrors && (
                <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2 text-yellow-300 text-sm">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Some content failed to load. The feed may be incomplete.
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <EventCardSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && items.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Rss className="w-16 h-16 text-surface-600 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No activity yet</h3>
                        <p className="text-surface-400 mb-6">
                            Follow artists, venues, and users to see their activity here
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <Link to="/artists">
                                <Button variant="secondary">Browse Artists</Button>
                            </Link>
                            <Link to="/venues">
                                <Button variant="secondary">Browse Venues</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Feed Items */}
            {!isLoading && items.length > 0 && (
                <div className="space-y-4">
                    {items.map(item => (
                        <FeedCard key={`${item.type}-${item.id}`} item={item} />
                    ))}

                    {hasMore && (
                        <div className="text-center mt-6">
                            <Button
                                variant="secondary"
                                onClick={() => setPage(p => p + 1)}
                            >
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}