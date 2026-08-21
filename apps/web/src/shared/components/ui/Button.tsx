import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    /** Text shown to assistive tech while loading. Defaults to the button's own label. */
    loadingLabel?: string
}

/**
 * A slot on the board. Square, flat, bordered by one device pixel.
 * Loading is a marching rule under the label, not a spinner — the board
 * has no rotating parts.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading,
            loadingLabel,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        const variants = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            ghost: 'btn-ghost',
            danger: 'btn-danger',
        }

        const sizes = {
            sm: 'text-[0.6875rem] px-2.5 min-h-[1.875rem]',
            md: '',
            lg: 'text-ui px-5 min-h-[2.75rem]',
        }

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                aria-busy={isLoading || undefined}
                className={cn('relative', variants[variant], sizes[size], className)}
                {...props}
            >
                <span className={cn(isLoading && 'opacity-60')}>{children}</span>
                {isLoading && (
                    <>
                        <span
                            aria-hidden="true"
                            className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
                        >
                            <span className="block h-full w-1/3 bg-current animate-[skeletonWipe_1.1s_cubic-bezier(.2,0,0,1)_infinite]" />
                        </span>
                        <span className="sr-only">{loadingLabel ?? 'Working'}</span>
                    </>
                )}
            </button>
        )
    }
)

Button.displayName = 'Button'
