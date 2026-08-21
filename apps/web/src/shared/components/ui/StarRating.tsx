import { useId, useRef } from 'react'
import { cn } from '@/shared/lib/utils'

const SLOTS = [1, 2, 3, 4, 5] as const

const SLOT_SIZE = {
    sm: 'w-[9px] h-[14px]',
    md: 'w-[14px] h-[22px]',
    lg: 'w-[22px] h-[34px]',
} as const

type Size = keyof typeof SLOT_SIZE

interface ScoreStripProps {
    value: number
    size?: Size
    className?: string
}

/**
 * The score strip — five slots on a rail. Filled slots are amber plastic,
 * empty slots are the groove behind the board. This replaces the star icon
 * everywhere; it is the same object at 14px in a row and at 34px on a review.
 */
export function ScoreStrip({ value, size = 'md', className }: ScoreStripProps) {
    return (
        <span className={cn('score', className)} aria-hidden="true">
            {SLOTS.map((slot) => (
                <span
                    key={slot}
                    className={cn(
                        'score-slot',
                        SLOT_SIZE[size],
                        slot <= Math.round(value) && 'score-slot-filled'
                    )}
                />
            ))}
        </span>
    )
}

interface StarRatingProps {
    value: number
    onChange?: (rating: number) => void
    size?: Size
    readonly?: boolean
    showValue?: boolean
    /** Accessible name for the rating control. */
    label?: string
}

const WORDS: Record<number, string> = {
    1: 'Bad night',
    2: 'Off night',
    3: 'Solid',
    4: 'Great night',
    5: 'One of the best',
}

/**
 * Kept under its original name so every call site keeps working, but this is
 * the score strip: a real radio group when interactive, a flat mark when not.
 */
export function StarRating({
    value,
    onChange,
    size = 'md',
    readonly = false,
    showValue = false,
    label = 'Rating',
}: StarRatingProps) {
    const groupId = useId()
    const slotRefs = useRef<Array<HTMLButtonElement | null>>([])

    if (readonly || !onChange) {
        return (
            <span className="inline-flex items-center gap-2">
                <ScoreStrip value={value} size={size} />
                <span className="sr-only">
                    {value > 0 ? `${value} out of 5` : 'Not rated'}
                </span>
                {showValue && (
                    <span className="tnum text-ui-sm text-bone-dim" aria-hidden="true">
                        {value > 0 ? value.toFixed(1) : '—'}
                    </span>
                )}
            </span>
        )
    }

    const move = (next: number) => {
        const clamped = Math.min(5, Math.max(1, next))
        onChange(clamped)
        slotRefs.current[clamped - 1]?.focus()
    }

    const handleKeyDown = (e: React.KeyboardEvent, slot: number) => {
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                e.preventDefault()
                move(slot + 1)
                break
            case 'ArrowLeft':
            case 'ArrowDown':
                e.preventDefault()
                move(slot - 1)
                break
            case 'Home':
                e.preventDefault()
                move(1)
                break
            case 'End':
                e.preventDefault()
                move(5)
                break
            case ' ':
            case 'Enter':
                // preventDefault suppresses the native button click, so the
                // handler runs exactly once per keypress.
                e.preventDefault()
                onChange(slot)
                break
        }
    }

    return (
        <div className="flex items-center gap-3">
            <div
                role="radiogroup"
                aria-label={label}
                id={groupId}
                className="score"
            >
                {SLOTS.map((slot) => (
                    <button
                        key={slot}
                        ref={(el) => {
                            slotRefs.current[slot - 1] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={slot === value}
                        aria-label={`${slot} — ${WORDS[slot]}`}
                        tabIndex={slot === (value || 1) ? 0 : -1}
                        onClick={() => onChange(slot)}
                        onKeyDown={(e) => handleKeyDown(e, slot)}
                        className={cn(
                            'score-slot cursor-pointer transition-colors duration-150 ease-board',
                            SLOT_SIZE[size],
                            slot <= value && 'score-slot-filled',
                            slot > value && 'hover:border-strip'
                        )}
                    />
                ))}
            </div>
            <span
                className={cn(
                    'voice-label',
                    value > 0 ? 'text-strip' : 'text-bone-faint'
                )}
            >
                {value > 0 ? WORDS[value] : 'Pick a score'}
            </span>
        </div>
    )
}

interface RatingDisplayProps {
    rating: number
    count?: number
    size?: 'sm' | 'md'
}

/** Aggregate score: the figure is the material, the strip is the qualifier. */
export function RatingDisplay({ rating, count, size = 'md' }: RatingDisplayProps) {
    const hasRating = rating > 0

    return (
        <div className="flex items-center gap-2.5">
            <span
                className={cn(
                    'voice-board tnum leading-none',
                    hasRating ? 'text-strip' : 'text-bone-faint',
                    size === 'sm' ? 'text-board-md' : 'text-[1.75rem]'
                )}
            >
                {hasRating ? rating.toFixed(1) : '—'}
            </span>
            <span className="flex flex-col gap-1">
                <ScoreStrip value={rating} size="sm" />
                {count !== undefined && (
                    <span className="voice-label text-bone-faint">
                        {count === 0
                            ? 'No reviews'
                            : `${count} ${count === 1 ? 'review' : 'reviews'}`}
                    </span>
                )}
            </span>
        </div>
    )
}
