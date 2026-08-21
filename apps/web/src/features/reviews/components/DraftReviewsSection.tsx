import { Link } from 'react-router-dom'
import { useDrafts, usePublishDraft } from '@/features/reviews/api/drafts'
import { useDeleteReview } from '@/features/reviews/api/reviews'
import { Skeleton } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'
import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

/**
 * Unfinished reviews. People start these at 1am on the bus home
 * (PRODUCT.md §5.3), so this sits above everything else on My gigs.
 */
export function DraftReviewsSection() {
    // No `= []` default: a failed query must surface as an error state, not
    // silently hide the section (audit finding A13).
    const { data: draftsData, isLoading, isError, refetch } = useDrafts()
    const drafts = draftsData ?? []
    const publishDraft = usePublishDraft()
    const deleteReview = useDeleteReview()

    if (isLoading) {
        return (
            <div className="mb-8 space-y-2" role="status" aria-label="Loading your drafts">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-16 w-full" />
            </div>
        )
    }

    if (isError) {
        return (
            <div className="mb-8">
                <QueryErrorState title="Couldn't load your drafts" onRetry={() => refetch()} />
            </div>
        )
    }

    if (drafts.length === 0) return null

    return (
        <section className="mb-8">
            <h2 className="voice-label text-strip mb-3">
                Unfinished · {drafts.length}
            </h2>

            <div className="rail-list">
                {drafts.map(draft => (
                    <div key={draft.id} className="row">
                        <span className="row-body">
                            <span className="text-ui text-bone truncate">
                                {sanitizeText(draft.event?.name || 'Unknown gig')}
                            </span>
                            <span className="row-meta">
                                {draft.title
                                    ? `“${sanitizeText(draft.title)}”`
                                    : 'No title yet'}
                            </span>
                            <span className="voice-label text-bone-faint">
                                Last edited {formatRelativeTime(draft.updated_at)}
                            </span>
                        </span>

                        <span className="row-end flex-row items-center gap-1.5">
                            <Link
                                to={`/review/${draft.event_id}/edit`}
                                className="btn-secondary"
                            >
                                Finish it
                            </Link>
                            <button
                                type="button"
                                onClick={() => publishDraft.mutate(draft.id)}
                                disabled={publishDraft.isPending}
                                className="btn-ghost"
                            >
                                Publish
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Delete this draft? It cannot be recovered.'
                                        )
                                    ) {
                                        deleteReview.mutate({
                                            reviewId: draft.id,
                                            eventId: draft.event_id,
                                        })
                                    }
                                }}
                                disabled={deleteReview.isPending}
                                className="btn-ghost text-bone-faint hover:text-struck"
                            >
                                Delete
                            </button>
                        </span>
                    </div>
                ))}
            </div>
        </section>
    )
}
