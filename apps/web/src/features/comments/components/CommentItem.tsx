import { Trash2 } from 'lucide-react'
import { Avatar } from '@/shared/components/ui/Avatar'
import { formatRelativeTime } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { CommentWithProfile } from '@/features/comments/api/comments'

interface CommentItemProps {
    comment: CommentWithProfile
    onDelete: (id: string) => void
    canDelete: boolean
    isPending: boolean
}

export function CommentItem({ comment, onDelete, canDelete, isPending }: CommentItemProps) {
    const profile = comment.profile
    const name = sanitizeText(profile?.display_name || profile?.username || 'A gig-goer')

    return (
        <article className="flex gap-2.5 py-3 group">
            <Avatar src={profile?.avatar_url} name={name} size="sm" />

            <div className="flex-1 min-w-0">
                <p className="flex items-baseline gap-2">
                    <span className="text-ui-sm text-bone">{name}</span>
                    <span className="voice-label text-bone-faint">
                        {formatRelativeTime(comment.created_at)}
                    </span>
                </p>

                <p className="text-ui text-bone-dim mt-1 whitespace-pre-wrap">
                    {sanitizeText(comment.body)}
                </p>
            </div>

            {canDelete && (
                <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    disabled={isPending}
                    className="shrink-0 self-start p-1 text-bone-faint opacity-0 transition-opacity duration-150 ease-board group-hover:opacity-100 focus-visible:opacity-100 hover:text-struck disabled:opacity-40"
                >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="sr-only">Delete your comment</span>
                </button>
            )}
        </article>
    )
}
