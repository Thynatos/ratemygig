import { useRef, useState, useEffect } from 'react'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { useUploadAvatar, useRemoveAvatar } from '@/features/profile/api/avatar'
import { cn } from '@/shared/lib/utils'
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
            setError('Please select a JPEG, PNG, or WebP image')
            return
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('Image must be under 5MB')
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
                    setError('Failed to upload avatar')
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
        <div className="flex flex-col items-center gap-4">
            <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-surface-800 border-2 border-surface-700">
                    {displayUrl ? (
                        <img
                            src={displayUrl}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Camera className="w-8 h-8 text-surface-500" />
                        </div>
                    )}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface-900/60 rounded-full">
                            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className={cn(
                        'absolute bottom-0 right-0 w-8 h-8 rounded-full',
                        'bg-primary-500 text-white flex items-center justify-center',
                        'opacity-0 group-hover:opacity-100 transition-opacity',
                        'hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-400',
                        'disabled:opacity-50'
                    )}
                >
                    <Camera className="w-4 h-4" />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {currentAvatarUrl && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        disabled={isLoading}
                        className={cn(
                            'absolute top-0 right-0 w-8 h-8 rounded-full',
                            'bg-red-500/80 text-white flex items-center justify-center',
                            'opacity-0 group-hover:opacity-100 transition-opacity',
                            'hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-400',
                            'disabled:opacity-50'
                        )}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}

            <p className="text-xs text-surface-500">
                JPEG, PNG, or WebP. Max 5MB.
            </p>
        </div>
    )
}
