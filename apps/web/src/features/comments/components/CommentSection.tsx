import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { useComments, useCreateComment, useDeleteComment } from '@/features/comments/api/comments'
import { CommentItem } from './CommentItem'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Skeleton } from '@/shared/components/ui/Loading'

interface CommentSectionProps {
    reviewId: string
}

export function CommentSection({ reviewId }: CommentSectionProps) {
    const { user } = useAuth()
    const { data: comments = [], isLoading } = useComments(reviewId)
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
        <div className="mt-6 pt-6 border-t border-surface-700">
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-white">
                    Comments {comments.length > 0 && <span className="text-surface-400">({comments.length})</span>}
                </h3>
            </div>

            {user && (
                <div className="mb-4">
                    <div className="flex gap-3">
                        <Textarea
                            placeholder="Write a comment..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="min-h-[60px]"
                        />
                        <Button
                            size="sm"
                            onClick={handleSubmit}
                            disabled={!body.trim()}
                            isLoading={createComment.isPending}
                            className="self-end"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    {createComment.error && (
                        <p className="text-sm text-red-400 mt-2">
                            {(createComment.error as Error).message || 'Failed to post comment'}
                        </p>
                    )}
                </div>
            )}

            {isLoading && (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 py-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-3 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!isLoading && comments.length === 0 && (
                <p className="text-sm text-surface-500 text-center py-4">
                    No comments yet. Be the first!
                </p>
            )}

            {!isLoading && comments.length > 0 && (
                <div className="divide-y divide-surface-700/50">
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            onDelete={(id) => deleteComment.mutate({ commentId: id, reviewId })}
                            canDelete={!!user && user.id === comment.user_id}
                            isPending={deleteComment.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
