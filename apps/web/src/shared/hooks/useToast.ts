import { createContext, useContext } from 'react'

export interface ToastOptions {
    /** Reusing an id replaces that toast instead of stacking a second one. */
    id?: string
    /** A few words, set as a micro-caps label. */
    title: string
    /** What happened and what to do about it, in sentence case. */
    message: string
}

export interface ToastApi {
    /** Shows an error toast and returns its id. It stays until dismissed or replaced. */
    error: (toast: ToastOptions) => string
    dismiss: (id: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
    const toast = useContext(ToastContext)
    if (!toast) throw new Error('useToast must be used inside a ToastProvider')
    return toast
}
