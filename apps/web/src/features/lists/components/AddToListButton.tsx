import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
    useUserLists,
    useEventLists,
    useAddEventToList,
    useRemoveEventFromList,
} from '@/features/lists/api/lists'
import { CreateListModal } from './CreateListModal'
import { cn } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

interface AddToListButtonProps {
    eventId: string
}

export function AddToListButton({ eventId }: AddToListButtonProps) {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)

    const { data: lists = [] } = useUserLists(user?.id || '')
    const { data: listIdsWithEvent = [] } = useEventLists(eventId)
    const addToList = useAddEventToList()
    const removeFromList = useRemoveEventFromList()

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false)
                triggerRef.current?.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen])

    if (!user) return null

    const handleToggle = (listId: string) => {
        if (listIdsWithEvent.includes(listId)) {
            removeFromList.mutate({ listId, eventId })
        } else {
            addToList.mutate({ listId, eventId })
        }
    }

    return (
        <>
            <div className="relative">
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    className={cn('btn-secondary', isOpen && 'bg-board-raised border-strip')}
                >
                    Add to list
                </button>

                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                            aria-hidden="true"
                        />
                        <div
                            role="menu"
                            className="absolute right-0 top-full mt-1 z-50 w-64 border border-rail-strong bg-board shadow-lift"
                        >
                            {lists.length === 0 ? (
                                <p className="px-3 py-4 text-ui-sm text-bone-dim">
                                    You haven't made a list yet.
                                </p>
                            ) : (
                                <div className="max-h-64 overflow-y-auto">
                                    {lists.map(list => {
                                        const inList = listIdsWithEvent.includes(list.id)
                                        return (
                                            <button
                                                key={list.id}
                                                type="button"
                                                role="menuitemcheckbox"
                                                aria-checked={inList}
                                                onClick={() => handleToggle(list.id)}
                                                disabled={
                                                    addToList.isPending || removeFromList.isPending
                                                }
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b border-rail transition-colors duration-150 ease-board hover:bg-board-raised disabled:opacity-50"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={cn(
                                                        'w-4 h-4 border flex items-center justify-center shrink-0',
                                                        inList
                                                            ? 'bg-strip border-strip'
                                                            : 'border-rail-strong'
                                                    )}
                                                >
                                                    {inList && (
                                                        <Check className="w-3 h-3 text-strip-ink" />
                                                    )}
                                                </span>
                                                <span className="text-ui text-bone truncate">
                                                    {sanitizeText(list.name)}
                                                </span>
                                                <span className="voice-data text-ui-sm text-bone-faint ml-auto tabular-nums">
                                                    {list.item_count}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}

                            <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    setIsOpen(false)
                                    setShowCreateModal(true)
                                }}
                                className="w-full px-3 py-2.5 text-left voice-label text-strip transition-colors duration-150 ease-board hover:bg-board-raised"
                            >
                                New list
                            </button>
                        </div>
                    </>
                )}
            </div>

            <CreateListModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={listId => addToList.mutate({ listId, eventId })}
            />
        </>
    )
}
