import { useState } from 'react'
import { useComments, useCreateComment, useDeleteComment } from '@/features/comments/api/comments'
import { CommentItem } from './CommentItem'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Skeleton } from '@/shared/components/ui/Loading'
import { QueryErrorState } from '@/shared/components/QueryErrorState'

interface CommentSectionProps {
    reviewId: string
}

export function CommentSection({ reviewId }: CommentSectionProps) {
    const { user } = useAuth()
    // No `= []` default: a failed query must surface as an error state, not
    // masquerade as "no comments yet" (audit finding A13).
    const { data: commentsData, isLoading, isError, refetch } = useComments(reviewId)
    const comments = commentsData ?? []
    const createComment = useCreateComment(reviewId)
    const deleteComment = useDeleteComment()
    const [body, setBody] = useState('')

    const handleSubmit = () => {
        if (!body.trim()) return
        createComment.mutate(body, {
            onSuccess: () => setBody(''),
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <section className="mt-8 pt-5 border-t border-rail-strong">
            <h2 className="voice-label text-bone-dim mb-3">
                Replies
                {comments.length > 0 && <span className="ml-2 tnum">{comments.length}</span>}
            </h2>

            {user ? (
                <div className="mb-5">
                    <label htmlFor={`comment-${reviewId}`} className="sr-only">
                        Write a reply
                    </label>
                    <Textarea
                        id={`comment-${reviewId}`}
                        placeholder="Were you there? Say so."
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[72px]"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="voice-label text-bone-faint">
                            Enter to post · Shift + Enter for a new line
                        </p>
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={!body.trim()}
                            isLoading={createComment.isPending}
                            loadingLabel="Posting your reply"
                        >
                            Post reply
                        </Button>
                    </div>
                    {createComment.error && (
                        <p className="input-error" role="alert">
                            {(createComment.error as Error).message ||
                                'The reply did not post. Try again.'}
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-ui-sm text-bone-faint mb-5">Sign in to reply.</p>
            )}

            {isLoading && (
                <div className="space-y-3" role="status" aria-label="Loading replies">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-2.5 py-3">
                            <Skeleton className="w-8 h-8" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && isError && (
                <QueryErrorState title="Couldn't load the replies" onRetry={() => refetch()} />
            )}

            {!isLoading && !isError && comments.length === 0 && (
                <p className="text-ui-sm text-bone-faint py-2">No replies yet.</p>
            )}

            {!isLoading && !isError && comments.length > 0 && (
                <div className="divide-y divide-rail">
                    {comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            onDelete={id => deleteComment.mutate({ commentId: id, reviewId })}
                            canDelete={!!user && user.id === comment.user_id}
                            isPending={deleteComment.isPending}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}
