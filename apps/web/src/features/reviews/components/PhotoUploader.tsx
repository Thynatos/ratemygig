import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { sanitizeText } from '@/shared/lib/sanitize'

interface PhotoUploaderProps {
    photos: { id?: string; url: string; file?: File }[]
    onAdd: (files: File[]) => void
    onRemove: (index: number) => void
    maxPhotos?: number
    maxSizeMB?: number
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function PhotoUploader({
    photos,
    onAdd,
    onRemove,
    maxPhotos = 10,
    maxSizeMB = 10,
}: PhotoUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const canAddMore = photos.length < maxPhotos

    const validateFiles = (files: File[]): File[] => {
        setError(null)
        const valid: File[] = []

        for (const file of files) {
            if (!ACCEPTED_TYPES.includes(file.type)) {
                setError(`Invalid file type: ${sanitizeText(file.name)}. Use JPG, PNG, or WebP.`)
                continue
            }
            if (file.size > maxSizeMB * 1024 * 1024) {
                setError(`File too large: ${sanitizeText(file.name)}. Max size is ${maxSizeMB}MB.`)
                continue
            }
            if (photos.length + valid.length >= maxPhotos) {
                setError(`Maximum ${maxPhotos} photos allowed.`)
                break
            }
            valid.push(file)
        }

        return valid
    }

    const handleFiles = (files: File[]) => {
        const valid = validateFiles(files)
        if (valid.length > 0) {
            onAdd(valid)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const files = Array.from(e.dataTransfer.files)
        handleFiles(files)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files)
            handleFiles(files)
            e.target.value = '' // Reset input
        }
    }

    return (
        <div className="space-y-4">
            <label className="input-label">Photos</label>

            {/* Upload Area */}
            {canAddMore && (
                <div
                    className={cn(
                        'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
                        isDragging
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-surface-700 hover:border-surface-600'
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        multiple
                        className="hidden"
                        onChange={handleInputChange}
                    />
                    <Upload className="w-8 h-8 text-surface-500 mx-auto mb-2" />
                    <p className="text-surface-300 font-medium">
                        Drop photos here or click to upload
                    </p>
                    <p className="text-sm text-surface-500 mt-1">
                        JPG, PNG, WebP • Max {maxSizeMB}MB • Up to {maxPhotos} photos
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}

            {/* Photo Grid */}
            {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {photos.map((photo, index) => (
                        <div
                            key={photo.id || index}
                            className="relative aspect-square rounded-xl overflow-hidden bg-surface-800 group"
                        >
                            <img
                                src={photo.url}
                                alt={`Photo ${index + 1}`}
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}

                    {/* Add More Button */}
                    {canAddMore && (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-surface-700 hover:border-surface-600 flex flex-col items-center justify-center text-surface-500 hover:text-surface-400 transition-colors"
                        >
                            <ImageIcon className="w-6 h-6 mb-1" />
                            <span className="text-xs">Add</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
