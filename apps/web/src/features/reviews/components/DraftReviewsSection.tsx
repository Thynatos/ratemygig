import { Link } from 'react-router-dom'
import { PenLine, Send, Trash2, Clock } from 'lucide-react'
import { useDrafts, usePublishDraft } from '@/features/reviews/api/drafts'
import { useDeleteReview } from '@/features/reviews/api/reviews'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardContent } from '@/shared/components/ui/Card'
import { Skeleton } from '@/shared/components/ui/Loading'
import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

export function DraftReviewsSection() {
    const { data: drafts = [], isLoading } = useDrafts()
    const publishDraft = usePublishDraft()
    const deleteReview = useDeleteReview()

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-20 w-full" />
            </div>
        )
    }

    if (drafts.length === 0) return null

    return (
        <Card className="mb-6">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <PenLine className="w-5 h-5 text-accent-400" />
                    <h2 className="text-lg font-semibold text-white">
                        Draft Reviews ({drafts.length})
                    </h2>
                </div>

                <div className="space-y-3">
                    {drafts.map((draft) => (
                        <div
                            key={draft.id}
                            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-surface-800/50 border border-surface-700"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {sanitizeText(draft.event?.name || 'Unknown Event')}
                                </p>
                                <p className="text-sm text-surface-400 mt-0.5">
                                    {draft.title ? `&ldquo;${sanitizeText(draft.title)}&rdquo;` : '(untitled)'}
                                </p>
                                <p className="text-xs text-surface-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Edited {formatRelativeTime(draft.updated_at)}
                                </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <Link to={`/review/${draft.event_id}/edit`}>
                                    <Button size="sm" variant="ghost">
                                        <PenLine className="w-3.5 h-3.5" />
                                    </Button>
                                </Link>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => publishDraft.mutate(draft.id)}
                                    disabled={publishDraft.isPending}
                                    title="Publish"
                                >
                                    <Send className="w-3.5 h-3.5 text-green-400" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        if (window.confirm('Delete this draft?')) {
                                            deleteReview.mutate({ reviewId: draft.id, eventId: draft.event_id })
                                        }
                                    }}
                                    disabled={deleteReview.isPending}
                                    title="Delete"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
