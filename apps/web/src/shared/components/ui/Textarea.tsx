import { forwardRef, TextareaHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        const textareaId = id || props.name

        return (
            <div className="space-y-1">
                {label && (
                    <label htmlFor={textareaId} className="input-label">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={cn(
                        'input-field min-h-[120px] resize-y',
                        error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                        className
                    )}
                    {...props}
                />
                {hint && !error && (
                    <p className="text-sm text-surface-500">{hint}</p>
                )}
                {error && (
                    <p className="input-error">{error}</p>
                )}
            </div>
        )
    }
)

Textarea.displayName = 'Textarea'
