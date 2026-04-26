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

    return (
        <div className="flex gap-3 py-3 group">
            <Avatar
                src={profile?.avatar_url}
                name={profile?.display_name || profile?.username || 'User'}
                size="sm"
            />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">
                        {profile?.display_name || profile?.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-surface-500">
                        {formatRelativeTime(comment.created_at)}
                    </span>
                </div>

                <p className="text-sm text-surface-300 mt-1 whitespace-pre-wrap">
                    {sanitizeText(comment.body)}
                </p>
            </div>

            {canDelete && (
                <button
                    onClick={() => onDelete(comment.id)}
                    disabled={isPending}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 text-surface-500 hover:text-red-400 disabled:opacity-50"
                    title="Delete comment"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    )
}
