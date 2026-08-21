import { forwardRef, TextareaHTMLAttributes, useId } from 'react'
import { cn } from '@/shared/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string
    error?: string
    hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        const generatedId = useId()
        const textareaId = id || props.name || generatedId
        const hintId = `${textareaId}-hint`
        const errorId = `${textareaId}-error`

        return (
            <div>
                {label && (
                    <label htmlFor={textareaId} className="input-label">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                        cn(error && errorId, hint && !error && hintId).trim() || undefined
                    }
                    className={cn(
                        'input-field min-h-[140px] resize-y leading-relaxed',
                        className
                    )}
                    {...props}
                />
                {hint && !error && (
                    <p id={hintId} className="input-hint">
                        {hint}
                    </p>
                )}
                {error && (
                    <p id={errorId} className="input-error">
                        {error}
                    </p>
                )}
            </div>
        )
    }
)

Textarea.displayName = 'Textarea'
