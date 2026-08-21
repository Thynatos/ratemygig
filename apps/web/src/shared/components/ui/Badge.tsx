import { cn } from '@/shared/lib/utils'

type BadgeVariant = 'primary' | 'accent' | 'surface' | 'success' | 'warning' | 'danger'

interface BadgeProps {
    children: React.ReactNode
    variant?: BadgeVariant
    className?: string
}

/**
 * A strip slid into a slot. Flat, square, board-coloured ink on amber for the
 * live variant; hairline outline for everything else.
 *
 * Amber is earned, never decorative — see DESIGN.md §3. `primary` is the only
 * variant that fills, and it should appear at most once per view.
 */
export function Badge({ children, variant = 'surface', className }: BadgeProps) {
    const variants: Record<BadgeVariant, string> = {
        primary: 'bg-strip text-strip-ink border-strip',
        accent: 'text-strip border-strip',
        surface: 'text-bone-dim border-rail',
        success: 'text-bone border-bone-faint',
        warning: 'text-strip border-strip',
        danger: 'text-struck border-struck',
    }

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 voice-label border px-2 py-[0.3125rem]',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    )
}
