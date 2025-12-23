import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:shadow-glow',
            secondary: 'bg-surface-800 border border-surface-600 text-surface-100 hover:bg-surface-700 hover:border-surface-500',
            ghost: 'text-surface-300 hover:bg-surface-800 hover:text-surface-100',
            danger: 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30',
        }

        const sizes = {
            sm: 'px-3 py-1.5 text-sm rounded-lg',
            md: 'px-5 py-2.5 text-base rounded-xl',
            lg: 'px-6 py-3 text-lg rounded-xl',
        }

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    'inline-flex items-center justify-center font-semibold transition-all duration-300 active:scale-95',
                    'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 focus:ring-offset-surface-900',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {children}
            </button>
        )
    }
)

Button.displayName = 'Button'
