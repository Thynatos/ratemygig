import { useState } from 'react'
import { cn, getInitials } from '@/shared/lib/utils'

interface AvatarProps {
    src?: string | null
    name?: string | null
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
    const [error, setError] = useState(false)

    const sizes = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-base',
        xl: 'w-24 h-24 text-xl',
    }

    if (src && !error) {
        return (
            <img
                src={src}
                alt={name || 'User avatar'}
                className={cn('avatar', sizes[size], className)}
                onError={() => setError(true)}
            />
        )
    }

    return (
        <div
            className={cn(
                'avatar flex items-center justify-center font-semibold bg-gradient-to-br from-primary-500/30 to-accent-500/30 text-surface-200',
                sizes[size],
                className
            )}
        >
            {getInitials(name)}
        </div>
    )
}
