import { useRef, useState, useEffect } from 'react'
import { useUploadAvatar, useRemoveAvatar } from '@/features/profile/api/avatar'
import { LoadingSpinner } from '@/shared/components/ui/Loading'
import { FILE_LIMITS } from '@/shared/lib/constants'

interface AvatarUploadProps {
    currentAvatarUrl: string | null
    userId: string
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = FILE_LIMITS.AVATAR_MAX_BYTES

export function AvatarUpload({ currentAvatarUrl, userId }: AvatarUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const uploadMutation = useUploadAvatar()
    const removeMutation = useRemoveAvatar()
    const [error, setError] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    const isLoading = uploadMutation.isPending || removeMutation.isPending
    const displayUrl = previewUrl || currentAvatarUrl

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setError(null)

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError('That file is not a JPEG, PNG or WebP.')
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('That image is over 5 MB. Shrink it and try again.')
            return
        }

        const objectUrl = URL.createObjectURL(file)
        setPreviewUrl(objectUrl)

        uploadMutation.mutate(
            { userId, file },
            {
                onSuccess: () => {
                    setPreviewUrl(null)
                },
                onError: () => {
                    setPreviewUrl(null)
                    setError('The photo did not upload. Try again.')
                },
            }
        )

        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleRemove = () => {
        if (!currentAvatarUrl) return
        setError(null)
        removeMutation.mutate({ userId })
    }

    return (
        <div className="flex items-start gap-4">
            {/* Square, like the photo on a tour laminate. */}
            <div className="relative w-20 h-20 shrink-0 border border-rail-strong bg-board-raised overflow-hidden">
                {displayUrl ? (
                    <img
                        src={displayUrl}
                        alt="Your profile photo"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="w-full h-full flex items-center justify-center voice-label text-bone-faint">
                        None
                    </span>
                )}
                {isLoading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-board/80">
                        <LoadingSpinner size="sm" />
                    </span>
                )}
            </div>

            <div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleFileSelect}
                    aria-label="Choose a profile photo"
                />

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isLoading}
                        className="btn-secondary"
                    >
                        {currentAvatarUrl ? 'Change photo' : 'Add a photo'}
                    </button>

                    {currentAvatarUrl && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            disabled={isLoading}
                            className="btn-ghost text-bone-faint hover:text-struck"
                        >
                            Remove
                        </button>
                    )}
                </div>

                {error ? (
                    <p className="input-error" role="alert">
                        {error}
                    </p>
                ) : (
                    <p className="input-hint">JPEG, PNG or WebP, up to 5&nbsp;MB.</p>
                )}
            </div>
        </div>
    )
}
