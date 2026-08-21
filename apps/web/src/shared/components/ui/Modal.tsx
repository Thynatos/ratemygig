import { ReactNode, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl'
}

function trapFocus(container: HTMLElement) {
    const focusableSelectors = [
        'button:not([disabled])',
        'a[href]',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
    ]
    const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors.join(','))
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    return (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return
        if (focusable.length === 0) {
            e.preventDefault()
            return
        }
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault()
                last?.focus()
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault()
                first?.focus()
            }
        }
    }
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)
    const previouslyFocusedRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        let focusTrapHandler: ((e: KeyboardEvent) => void) | undefined
        const container = contentRef.current

        if (isOpen) {
            previouslyFocusedRef.current = document.activeElement as HTMLElement
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'

            // Focus trap and initial focus
            if (container) {
                focusTrapHandler = trapFocus(container)
                container.addEventListener('keydown', focusTrapHandler)
                // Focus the close button or first focusable element
                const closeBtn = container.querySelector<HTMLElement>('[aria-label="Close modal"]')
                ;(closeBtn || container).focus()
            }
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
            if (focusTrapHandler && container) {
                container.removeEventListener('keydown', focusTrapHandler)
            }
            // Restore focus when modal closes
            if (!isOpen && previouslyFocusedRef.current) {
                previouslyFocusedRef.current.focus()
            }
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizes = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    }

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) {
            onClose()
        }
    }

    return (
        <div
            ref={overlayRef}
            className="modal-overlay"
            onClick={handleOverlayClick}
            role="presentation"
        >
            <div
                ref={contentRef}
                className={cn('modal-content', sizes[size])}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                tabIndex={-1}
            >
                {title && (
                    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-rail">
                        <h2 id="modal-title" className="voice-slot text-ui text-bone">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="btn-icon shrink-0"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" aria-hidden="true" />
                        </button>
                    </div>
                )}
                <div className="p-4">{children}</div>
            </div>
        </div>
    )
}
