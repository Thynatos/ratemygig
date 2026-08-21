import { forwardRef, InputHTMLAttributes, useId } from 'react'
import { cn } from '@/shared/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, hint, id, ...props }, ref) => {
        const generatedId = useId()
        const inputId = id || props.name || generatedId
        const hintId = `${inputId}-hint`
        const errorId = `${inputId}-error`

        return (
            <div>
                {label && (
                    <label htmlFor={inputId} className="input-label">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={
                        cn(error && errorId, hint && !error && hintId).trim() || undefined
                    }
                    className={cn('input-field', className)}
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

Input.displayName = 'Input'
