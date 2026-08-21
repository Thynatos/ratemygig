import { useState } from 'react'
import { cn, getInitials } from '@/shared/lib/utils'

interface AvatarProps {
    src?: string | null
    name?: string | null
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
}

const SIZES = {
    sm: 'w-8 h-8 text-[0.625rem]',
    md: 'w-11 h-11 text-ui-sm',
    lg: 'w-16 h-16 text-ui',
    xl: 'w-24 h-24 text-board-md',
} as const

/** Intrinsic pixel dimensions, so an avatar reserves its box before it loads. */
const PIXELS = { sm: 32, md: 44, lg: 64, xl: 96 } as const

/** Square, like the photo on a tour laminate. */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
    const [error, setError] = useState(false)

    if (src && !error) {
        return (
            <img
                src={src}
                alt={name ? `${name}'s avatar` : ''}
                className={cn('avatar', SIZES[size], className)}
                width={PIXELS[size]}
                height={PIXELS[size]}
                loading="lazy"
                decoding="async"
                onError={() => setError(true)}
            />
        )
    }

    return (
        <div
            aria-hidden="true"
            className={cn(
                'avatar flex items-center justify-center voice-slot bg-board-raised text-bone-dim',
                SIZES[size],
                className
            )}
        >
            {getInitials(name)}
        </div>
    )
}
