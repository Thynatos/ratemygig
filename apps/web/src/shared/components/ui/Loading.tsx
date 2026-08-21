import { cn } from '@/shared/lib/utils'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const BAR_SIZE = {
    sm: 'w-12 h-[3px]',
    md: 'w-20 h-1',
    lg: 'w-32 h-1.5',
} as const

/**
 * The board has no rotating parts. Loading is a strip travelling along a
 * groove — the same single-axis grammar as everything else.
 */
export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
    return (
        <span
            role="status"
            aria-label="Loading"
            className={cn('block bg-groove border border-rail overflow-hidden', BAR_SIZE[size], className)}
        >
            <span className="block h-full w-1/3 bg-strip animate-[skeletonWipe_1.1s_cubic-bezier(.2,0,0,1)_infinite]" />
        </span>
    )
}

interface LoadingPageProps {
    message?: string
}

export function LoadingPage({ message = 'Reading the board' }: LoadingPageProps) {
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="voice-label text-bone-faint">{message}</p>
        </div>
    )
}

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('skeleton', className)} aria-hidden="true" />
}

/** A placeholder row that occupies the exact geometry of a real event row. */
export function EventCardSkeleton() {
    return (
        <div className="row" aria-hidden="true">
            <div className="row-slot gap-1.5">
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="h-7 w-11" />
                <Skeleton className="h-2.5 w-9" />
            </div>
            <div className="row-body gap-2">
                <Skeleton className="h-4 w-3/5 max-w-[16rem]" />
                <Skeleton className="h-3 w-4/5 max-w-[22rem]" />
            </div>
            <div className="row-end">
                <Skeleton className="h-[22px] w-[80px]" />
            </div>
        </div>
    )
}

interface RowSkeletonListProps {
    count?: number
    label?: string
}

/** Loading state for any rail list. Announces once, not per row. */
export function RowSkeletonList({ count = 6, label = 'Loading gigs' }: RowSkeletonListProps) {
    return (
        <div className="rail-list" role="status" aria-label={label}>
            {Array.from({ length: count }, (_, i) => (
                <EventCardSkeleton key={i} />
            ))}
        </div>
    )
}
