import { supabase } from '@/shared/lib/supabase'
import { STORAGE } from '@/shared/lib/constants'

const BUCKET_NAME = STORAGE.AVATAR_BUCKET

export async function resizeImage(file: File, maxSize: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)

        img.onload = () => {
            URL.revokeObjectURL(url)

            let { width, height } = img
            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = Math.round((height / width) * maxSize)
                    width = maxSize
                } else {
                    width = Math.round((width / height) * maxSize)
                    height = maxSize
                }
            }

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height

            const ctx = canvas.getContext('2d')
            if (!ctx) {
                reject(new Error('Could not get canvas context'))
                return
            }

            ctx.drawImage(img, 0, 0, width, height)

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob)
                    } else {
                        reject(new Error('Failed to convert canvas to blob'))
                    }
                },
                file.type,
                0.9
            )
        }

        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('Failed to load image'))
        }

        img.src = url
    })
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
    const resized = await resizeImage(file, 256)
    const ext = file.name.split('.').pop() || 'jpg'

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(`${userId}/avatar.${ext}`, resized, {
            cacheControl: '3600',
            upsert: true,
        })

    if (error) throw error

    return getAvatarPublicUrl(`${userId}/avatar.${ext}`)
}

export async function deleteAvatar(userId: string): Promise<void> {
    const { data: files } = await supabase.storage
        .from(BUCKET_NAME)
        .list(userId)

    if (files && files.length > 0) {
        const paths = files.map((f) => `${userId}/${f.name}`)
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove(paths)

        if (error) {
            console.error('Failed to delete avatar files:', error)
        }
    }
}

export function getAvatarPublicUrl(storagePath: string): string {
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

    return data.publicUrl
}
