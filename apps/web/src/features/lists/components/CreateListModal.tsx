import { useState } from 'react'
import { Globe, Lock } from 'lucide-react'
import { useCreateList } from '@/features/lists/api/lists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Modal } from '@/shared/components/ui/Modal'
import { cn } from '@/shared/lib/utils'

interface CreateListModalProps {
    isOpen: boolean
    onClose: () => void
    onCreated?: (listId: string) => void
}

export function CreateListModal({ isOpen, onClose, onCreated }: CreateListModalProps) {
    const { user } = useAuth()
    const createList = useCreateList()
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [isPublic, setIsPublic] = useState(true)

    const handleCreate = () => {
        if (!name.trim() || !user) return

        createList.mutate(
            { name: name.trim(), description: description.trim() || undefined, is_public: isPublic },
            {
                onSuccess: (data) => {
                    setName('')
                    setDescription('')
                    setIsPublic(true)
                    onClose()
                    onCreated?.(data.id)
                },
            }
        )
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New List">
            <div className="space-y-4">
                <Input
                    label="List Name"
                    placeholder="e.g., Best Shows of 2024"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

                <Textarea
                    label="Description (optional)"
                    placeholder="What's this list about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-surface-300">
                        {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        {isPublic ? 'Public list' : 'Private list'}
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsPublic(!isPublic)}
                        className={cn(
                            'relative w-12 h-6 rounded-full transition-colors',
                            isPublic ? 'bg-green-500' : 'bg-surface-600'
                        )}
                    >
                        <span
                            className={cn(
                                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                                isPublic ? 'translate-x-7' : 'translate-x-1'
                            )}
                        />
                    </button>
                </div>

                {createList.error && (
                    <p className="text-sm text-red-400">Failed to create list</p>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        isLoading={createList.isPending}
                    >
                        Create List
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
