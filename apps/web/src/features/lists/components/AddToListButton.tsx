import { useState } from 'react'
import { ListPlus, Check, Plus } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUserLists, useEventLists, useAddEventToList, useRemoveEventFromList } from '@/features/lists/api/lists'
import { CreateListModal } from './CreateListModal'
import { cn } from '@/shared/lib/utils'

interface AddToListButtonProps {
    eventId: string
}

export function AddToListButton({ eventId }: AddToListButtonProps) {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)

    const { data: lists = [] } = useUserLists(user?.id || '')
    const { data: listIdsWithEvent = [] } = useEventLists(eventId)
    const addToList = useAddEventToList()
    const removeFromList = useRemoveEventFromList()

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
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                        'bg-surface-800 border border-surface-600 text-surface-200',
                        'hover:bg-surface-700 hover:border-surface-500',
                        isOpen && 'border-primary-500/50'
                    )}
                >
                    <ListPlus className="w-4 h-4" />
                    Add to List
                </button>

                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-surface-700 bg-surface-900 shadow-xl animate-scale-in">
                            <div className="p-2">
                                {lists.length === 0 ? (
                                    <p className="text-sm text-surface-400 p-3 text-center">
                                        No lists yet
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {lists.map((list) => (
                                            <button
                                                key={list.id}
                                                onClick={() => handleToggle(list.id)}
                                                disabled={addToList.isPending || removeFromList.isPending}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors text-left"
                                            >
                                                <div className={cn(
                                                    'w-5 h-5 rounded border flex items-center justify-center shrink-0',
                                                    listIdsWithEvent.includes(list.id)
                                                        ? 'bg-primary-500 border-primary-500'
                                                        : 'border-surface-600'
                                                )}>
                                                    {listIdsWithEvent.includes(list.id) && (
                                                        <Check className="w-3.5 h-3.5 text-white" />
                                                    )}
                                                </div>
                                                <span className="text-sm text-white truncate">{list.name}</span>
                                                <span className="text-xs text-surface-500 ml-auto">{list.item_count}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="border-t border-surface-700 mt-2 pt-2">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false)
                                            setShowCreateModal(true)
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-800 transition-colors text-sm text-primary-400"
                                    >
                                        <Plus className="w-4 h-4" />
                                        New list
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <CreateListModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />
        </>
    )
}
