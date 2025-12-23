import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    }

    return (
        <Loader2 className={cn('animate-spin text-primary-500', sizes[size], className)} />
    )
}

interface LoadingPageProps {
    message?: string
}

export function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
    return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-surface-400">{message}</p>
        </div>
    )
}

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('skeleton', className)} />
}

export function EventCardSkeleton() {
    return (
        <div className="glass-card p-5 space-y-4">
            <div className="flex gap-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
        </div>
    )
}
