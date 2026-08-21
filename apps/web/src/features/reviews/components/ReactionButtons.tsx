import {
    useReviewReactions,
    useUserReactions,
    useReactToReview,
    useRemoveReaction,
} from '../api/reviews'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/shared/lib/utils'
import type { ReactionType } from '@core/index'

interface ReactionButtonsProps {
    reviewId: string
    compact?: boolean
}

/**
 * Reactions as printed marks: a hairline slot at rest, filled amber when you
 * have marked it. Counts are tabular so a column of reviews stays aligned.
 */
const REACTION_CONFIG: { type: ReactionType; label: string; short: string }[] = [
    { type: 'like', label: 'Good night', short: 'Good' },
    { type: 'helpful', label: 'Useful', short: 'Useful' },
    { type: 'love', label: 'Was there too', short: 'Same' },
]

export function ReactionButtons({ reviewId, compact = false }: ReactionButtonsProps) {
    const { user } = useAuth()
    const { data: summary = { like: 0, helpful: 0, love: 0 } } = useReviewReactions(reviewId)
    const { data: userReactions = { like: false, helpful: false, love: false } } =
        useUserReactions(reviewId)
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
        <div className="flex items-center gap-1.5">
            {REACTION_CONFIG.map(({ type, label, short }) => {
                const count = summary[type] ?? 0
                const isActive = userReactions[type]
                const isPending = reactMutation.isPending || removeMutation.isPending

                return (
                    <button
                        key={type}
                        type="button"
                        onClick={() => handleClick(type)}
                        disabled={!user || isPending}
                        aria-pressed={isActive}
                        className={cn(
                            'inline-flex items-center gap-1.5 border voice-label transition-colors duration-150 ease-board',
                            compact ? 'px-1.5 py-1' : 'px-2.5 py-1.5',
                            isActive
                                ? 'bg-strip text-strip-ink border-strip'
                                : 'text-bone-dim border-rail hover:border-bone-faint hover:text-bone',
                            !user && 'opacity-50 cursor-not-allowed'
                        )}
                        title={!user ? 'Sign in to react' : undefined}
                    >
                        {compact ? short : label}
                        {count > 0 && <span className="tnum">{count}</span>}
                    </button>
                )
            })}
        </div>
    )
}
