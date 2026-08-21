import { useState, useRef } from 'react'
import { X } from 'lucide-react'
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
                setError(
                    `${sanitizeText(file.name)} isn't a JPG, PNG or WebP, so it wasn't added.`
                )
                continue
            }
            if (file.size > maxSizeMB * 1024 * 1024) {
                setError(
                    `${sanitizeText(file.name)} is over ${maxSizeMB}MB. Shrink it and try again.`
                )
                continue
            }
            if (photos.length + valid.length >= maxPhotos) {
                setError(`That's the limit — ${maxPhotos} photos per review.`)
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
        handleFiles(Array.from(e.dataTransfer.files))
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(Array.from(e.target.files))
            e.target.value = '' // Reset input
        }
    }

    return (
        <div className="space-y-3">
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                multiple
                className="sr-only"
                onChange={handleInputChange}
                aria-label="Choose photos to add to this review"
            />

            {canAddMore && (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={e => {
                        e.preventDefault()
                        setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                        'w-full border border-dashed px-4 py-6 text-center transition-colors duration-150 ease-board',
                        isDragging
                            ? 'border-strip bg-board-raised'
                            : 'border-rail-strong hover:border-bone-faint hover:bg-board-raised'
                    )}
                >
                    <span className="block voice-slot text-ui text-bone">
                        Drop photos here, or choose files
                    </span>
                    <span className="block voice-label text-bone-faint mt-1.5">
                        JPG, PNG or WebP · up to {maxSizeMB}MB each · {maxPhotos} max
                    </span>
                </button>
            )}

            {error && (
                <p className="text-ui-sm text-struck" role="alert">
                    {error}
                </p>
            )}

            {photos.length > 0 && (
                <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
                    {photos.map((photo, index) => (
                        <li
                            key={photo.id || index}
                            className="relative aspect-square overflow-hidden bg-board-raised border border-rail group"
                        >
                            <img
                                src={photo.url}
                                alt={`Photo ${index + 1} of ${photos.length}`}
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="absolute top-0 right-0 p-1 bg-struck text-board opacity-0 transition-opacity duration-150 ease-board group-hover:opacity-100 focus-visible:opacity-100"
                            >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                                <span className="sr-only">Remove photo {index + 1}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
