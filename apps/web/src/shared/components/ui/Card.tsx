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

interface PanelProps {
    /** Rendered in the panel's rail header, in board voice. */
    title?: ReactNode
    /** Sits opposite the title on the same rail. */
    action?: ReactNode
    children: ReactNode
    className?: string
    bodyClassName?: string
}

/**
 * The canonical grouping device: a titled board panel. The title sits on a
 * rail above the content, the way a section label is screwed above its column
 * of dates.
 */
export function Panel({ title, action, children, className, bodyClassName }: PanelProps) {
    return (
        <section className={cn('bg-board border border-rail', className)}>
            {(title || action) && (
                <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-rail">
                    {title && <h2 className="voice-label text-bone-dim">{title}</h2>}
                    {action}
                </header>
            )}
            <div className={cn('p-4', bodyClassName)}>{children}</div>
        </section>
    )
}
