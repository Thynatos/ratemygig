import { useState } from 'react'
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
            {
                name: name.trim(),
                description: description.trim() || undefined,
                is_public: isPublic,
            },
            {
                onSuccess: data => {
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
        <Modal isOpen={isOpen} onClose={onClose} title="New list">
            <div className="space-y-5">
                <Input
                    label="Name"
                    name="list-name"
                    placeholder="Best nights of 2026"
                    value={name}
                    onChange={e => setName(e.target.value)}
                />

                <Textarea
                    label="Description"
                    name="list-description"
                    placeholder="What holds this list together?"
                    hint="Optional."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="min-h-[80px]"
                />

                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="voice-label text-bone-dim mb-1">Who can see it</p>
                        <p className="text-ui-sm text-bone-faint">
                            {isPublic
                                ? 'Anyone with the link, and it shows on your profile.'
                                : 'Only you.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isPublic}
                        aria-label="Make this list public"
                        onClick={() => setIsPublic(!isPublic)}
                        className={cn(
                            'relative shrink-0 w-14 h-7 border transition-colors duration-150 ease-board',
                            isPublic ? 'bg-strip border-strip' : 'bg-groove border-rail-strong'
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                'absolute top-[3px] w-5 h-5 transition-transform duration-150 ease-board',
                                isPublic
                                    ? 'translate-x-[30px] bg-strip-ink'
                                    : 'translate-x-[3px] bg-bone-faint'
                            )}
                        />
                    </button>
                </div>

                {createList.error && (
                    <p className="input-error" role="alert">
                        The list did not save. Your name and description are still here.
                    </p>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        isLoading={createList.isPending}
                        loadingLabel="Making the list"
                    >
                        Make list
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
