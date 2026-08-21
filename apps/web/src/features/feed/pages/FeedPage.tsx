import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActivityFeed } from '../api/feed'
import { FeedCard } from '../components/FeedCard'
import { Button } from '@/shared/components/ui/Button'
import { RowSkeletonList } from '@/shared/components/ui/Loading'
import { BoardHeader, EmptyState } from '@/shared/components/ui/Board'
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
            <div className="page page-body">
                <EmptyState
                    title="Sign in to see your feed"
                    body="Your feed is what the people, artists and rooms you follow have been up to."
                    action={
                        <Link to="/login" className="btn-primary">
                            Sign in
                        </Link>
                    }
                />
            </div>
        )
    }

    return (
        <div className="page page-body max-w-4xl">
            <BoardHeader
                title="Feed"
                lede="What the people, artists and rooms you follow have been doing. Newest first."
            />

            {hasErrors && (
                <p
                    role="status"
                    className="border border-rail-strong bg-board px-4 py-3 mb-4 text-ui-sm text-bone-dim"
                >
                    <span className="voice-label text-strip mr-2">Partial</span>
                    Some of the feed didn't load, so this view is incomplete.
                </p>
            )}

            {isLoading && <RowSkeletonList count={5} label="Loading your feed" />}

            {!isLoading && items.length === 0 && (
                <EmptyState
                    title="Nothing here yet"
                    body="Follow an artist, a venue or another gig-goer and their activity turns up here."
                    action={
                        <span className="flex flex-wrap justify-center gap-2">
                            <Link to="/artists" className="btn-secondary">
                                Browse artists
                            </Link>
                            <Link to="/venues" className="btn-secondary">
                                Browse venues
                            </Link>
                        </span>
                    }
                />
            )}

            {!isLoading && items.length > 0 && (
                <>
                    <div className="rail-list">
                        {items.map(item => (
                            <FeedCard key={`${item.type}-${item.id}`} item={item} />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-4">
                            <Button variant="secondary" onClick={() => setPage(p => p + 1)}>
                                Show older activity
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
