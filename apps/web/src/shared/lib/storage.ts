import { supabase } from '@/shared/lib/supabase'

const BUCKET_NAME = 'review-photos'
const SIGNED_URL_EXPIRY = 3600 // 1 hour

/**
 * Get a signed URL for a review photo
 */
export async function getSignedPhotoUrl(storagePath: string): Promise<string | null> {
    if (!storagePath) return null

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY)

    if (error) {
        console.error('Error getting signed URL:', error)
        return null
    }

    return data.signedUrl
}

/**
 * Get multiple signed URLs for review photos
 */
export async function getSignedPhotoUrls(
    storagePaths: string[]
): Promise<Map<string, string>> {
    const urlMap = new Map<string, string>()

    if (storagePaths.length === 0) return urlMap

    // Use batch signing for efficiency
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrls(storagePaths, SIGNED_URL_EXPIRY)

    if (error || !data) {
        console.error('Error getting signed URLs:', error)
        return urlMap
    }

    data.forEach((item, index) => {
        if (item.signedUrl) {
            urlMap.set(storagePaths[index], item.signedUrl)
        }
    })

    return urlMap
}

/**
 * Get the public URL for a photo (if bucket is public)
 */
export function getPublicPhotoUrl(storagePath: string): string {
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath)

    return data.publicUrl
}

/**
 * Upload a photo to storage
 */
export async function uploadPhoto(
    file: File,
    userId: string,
    reviewId: string
): Promise<{ path: string; error: Error | null }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `${userId}/${reviewId}/${fileName}`

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        })

    if (error) {
        return { path: '', error: error as Error }
    }

    return { path: filePath, error: null }
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(storagePath: string): Promise<Error | null> {
    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath])

    return error as Error | null
}
