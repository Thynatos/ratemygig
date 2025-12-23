import { Star } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface StarRatingProps {
    value: number
    onChange?: (rating: number) => void
    size?: 'sm' | 'md' | 'lg'
    readonly?: boolean
    showValue?: boolean
}

export function StarRating({
    value,
    onChange,
    size = 'md',
    readonly = false,
    showValue = false,
}: StarRatingProps) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    }

    const handleClick = (rating: number) => {
        if (!readonly && onChange) {
            onChange(rating)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
        if (!readonly && onChange && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onChange(rating)
        }
    }

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((rating) => (
                <button
                    key={rating}
                    type="button"
                    onClick={() => handleClick(rating)}
                    onKeyDown={(e) => handleKeyDown(e, rating)}
                    disabled={readonly}
                    className={cn(
                        'transition-all duration-200',
                        !readonly && 'hover:scale-110 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded',
                        readonly && 'cursor-default'
                    )}
                    aria-label={`Rate ${rating} stars`}
                    tabIndex={readonly ? -1 : 0}
                >
                    <Star
                        className={cn(
                            sizes[size],
                            rating <= value
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-surface-600'
                        )}
                    />
                </button>
            ))}
            {showValue && (
                <span className="ml-2 text-sm text-surface-400">
                    {value > 0 ? value.toFixed(1) : '-'}
                </span>
            )}
        </div>
    )
}

interface RatingDisplayProps {
    rating: number
    count?: number
    size?: 'sm' | 'md'
}

export function RatingDisplay({ rating, count, size = 'md' }: RatingDisplayProps) {
    const sizes = {
        sm: 'text-sm',
        md: 'text-base',
    }

    return (
        <div className={cn('flex items-center gap-2', sizes[size])}>
            <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold text-white">
                    {rating > 0 ? rating.toFixed(1) : '-'}
                </span>
            </div>
            {count !== undefined && (
                <span className="text-surface-500">
                    ({count} {count === 1 ? 'review' : 'reviews'})
                </span>
            )}
        </div>
    )
}
