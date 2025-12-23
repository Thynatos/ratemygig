import { cn } from '@/shared/lib/utils'

type BadgeVariant = 'primary' | 'accent' | 'surface' | 'success' | 'warning' | 'danger'

interface BadgeProps {
    children: React.ReactNode
    variant?: BadgeVariant
    className?: string
}

export function Badge({ children, variant = 'surface', className }: BadgeProps) {
    const variants: Record<BadgeVariant, string> = {
        primary: 'bg-primary-500/20 text-primary-300 border border-primary-500/30',
        accent: 'bg-accent-500/20 text-accent-300 border border-accent-500/30',
        surface: 'bg-surface-700/50 text-surface-300 border border-surface-600',
        success: 'bg-green-500/20 text-green-300 border border-green-500/30',
        warning: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
        danger: 'bg-red-500/20 text-red-300 border border-red-500/30',
    }

    return (
        <span
            className={cn(
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                variants[variant],
                className
            )}
        >
            {children}
        </span>
    )
}
