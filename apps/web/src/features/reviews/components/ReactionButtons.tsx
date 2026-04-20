import { ThumbsUp, Heart, Flame } from 'lucide-react'
import { useReviewReactions, useUserReactions, useReactToReview, useRemoveReaction } from '../api/reviews'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/utils'
import type { ReactionType } from '@core/index'

interface ReactionButtonsProps {
    reviewId: string
    compact?: boolean
}

const REACTION_CONFIG: { type: ReactionType; icon: typeof ThumbsUp; label: string }[] = [
    { type: 'like', icon: Flame, label: 'Like' },
    { type: 'helpful', icon: ThumbsUp, label: 'Helpful' },
    { type: 'love', icon: Heart, label: 'Love' },
]

export function ReactionButtons({ reviewId, compact = false }: ReactionButtonsProps) {
    const { user } = useAuth()
    const { data: summary = { like: 0, helpful: 0, love: 0 } } = useReviewReactions(reviewId)
    const { data: userReactions = { like: false, helpful: false, love: false } } = useUserReactions(reviewId)
    const reactMutation = useReactToReview(reviewId)
    const removeMutation = useRemoveReaction(reviewId)

    const handleClick = (type: ReactionType) => {
        if (!user) return
        if (userReactions[type]) {
            removeMutation.mutate(type)
        } else {
            reactMutation.mutate(type)
        }
    }

    return (
        <div className={cn('flex items-center gap-3', compact && 'gap-2')}>
            {REACTION_CONFIG.map(({ type, icon: Icon, label }) => {
                const count = summary[type] ?? 0
                const isActive = userReactions[type]
                const isPending = reactMutation.isPending || removeMutation.isPending

                return (
                    <button
                        key={type}
                        onClick={() => handleClick(type)}
                        disabled={!user || isPending}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg border transition-all duration-200',
                            compact
                                ? 'px-2 py-1 text-xs'
                                : 'px-3 py-1.5 text-sm',
                            isActive
                                ? 'bg-primary-500/20 text-primary-400 border-primary-500/30 hover:bg-primary-500/30'
                                : 'bg-surface-800 text-surface-400 border-surface-700 hover:bg-surface-700 hover:text-surface-200',
                            !user && 'opacity-50 cursor-not-allowed'
                        )}
                        title={!user ? 'Sign in to react' : undefined}
                    >
                        <Icon className={cn(compact ? 'w-3.5 h-3.5' : 'w-4 h-4', isActive && type === 'love' && 'fill-current')} />
                        {!compact && <span>{label}</span>}
                        {count > 0 && (
                            <span className={cn(
                                'font-medium',
                                compact ? 'text-xs' : 'text-xs'
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}