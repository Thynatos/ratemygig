import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ToastContext, type ToastApi, type ToastOptions } from '@/shared/hooks/useToast'

interface ToastItem {
    id: string
    title: string
    message: string
}

const MAX_TOASTS = 3

/**
 * Error toasts, set on the board: a struck-rule panel that slides into its slot
 * from the left, bottom of the screen. They stay until dismissed or replaced —
 * an error that times out can be missed — so whoever raises one should dismiss
 * it by id when it stops being relevant.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const nextId = useRef(0)

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
    }, [])

    const error = useCallback((options: ToastOptions) => {
        nextId.current += 1
        const id = options.id ?? `toast-${nextId.current}`
        setToasts(prev =>
            [
                ...prev.filter(toast => toast.id !== id),
                { id, title: options.title, message: options.message },
            ].slice(-MAX_TOASTS)
        )
        return id
    }, [])

    const api = useMemo<ToastApi>(() => ({ error, dismiss }), [error, dismiss])

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="fixed z-[60] bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] sm:right-auto sm:w-[26rem] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        role="alert"
                        className="pointer-events-auto flex items-start gap-3 border border-struck bg-board shadow-lift py-3 pl-4 pr-1.5 animate-slot-in"
                    >
                        <div className="min-w-0 flex-1 pt-1">
                            <p className="voice-label text-struck">{toast.title}</p>
                            <p className="mt-1.5 text-ui text-bone">{toast.message}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => dismiss(toast.id)}
                            className="btn-icon shrink-0"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">Dismiss this message</span>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
