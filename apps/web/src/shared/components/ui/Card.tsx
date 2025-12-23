import { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface CardProps {
    children: ReactNode
    className?: string
    onClick?: () => void
    hoverable?: boolean
}

export function Card({ children, className, onClick, hoverable }: CardProps) {
    return (
        <div
            className={cn(
                'glass-card',
                hoverable && 'transition-all duration-300 hover:border-primary-500/50 hover:shadow-glow cursor-pointer',
                onClick && 'cursor-pointer',
                className
            )}
            onClick={onClick}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps {
    children: ReactNode
    className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn('px-5 py-4 border-b border-surface-700/50', className)}>
            {children}
        </div>
    )
}

interface CardContentProps {
    children: ReactNode
    className?: string
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={cn('p-5', className)}>
            {children}
        </div>
    )
}

interface CardFooterProps {
    children: ReactNode
    className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div className={cn('px-5 py-4 border-t border-surface-700/50', className)}>
            {children}
        </div>
    )
}
