import { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface CardProps {
    children: ReactNode
    className?: string
    onClick?: () => void
    hoverable?: boolean
}

/**
 * A board panel. Not a card: no radius, no shadow, no glass. Bounded by one
 * device pixel of rail. Kept under the Card name so existing call sites keep
 * working while pages migrate to the row contract.
 */
export function Card({ children, className, onClick, hoverable }: CardProps) {
    return (
        <div
            className={cn(
                'bg-board border border-rail',
                (hoverable || onClick) &&
                'transition-colors duration-150 ease-board hover:bg-board-raised hover:border-rail-strong cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    )
}

interface CardSectionProps {
    children: ReactNode
    className?: string
}

export function CardHeader({ children, className }: CardSectionProps) {
    return (
        <div className={cn('px-4 py-3 border-b border-rail', className)}>
            {children}
        </div>
    )
}

export function CardContent({ children, className }: CardSectionProps) {
    return <div className={cn('p-4', className)}>{children}</div>
}

export function CardFooter({ children, className }: CardSectionProps) {
    return (
        <div className={cn('px-4 py-3 border-t border-rail', className)}>
            {children}
        </div>
    )
}
