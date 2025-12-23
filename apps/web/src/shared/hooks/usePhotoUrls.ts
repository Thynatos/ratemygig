import { useState, useEffect } from 'react'
import { getSignedPhotoUrls } from '@/shared/lib/storage'

/**
 * Hook to get signed URLs for review photos
 */
export function usePhotoUrls(storagePaths: string[]) {
    const [urls, setUrls] = useState<Map<string, string>>(new Map())
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (storagePaths.length === 0) {
            setUrls(new Map())
            return
        }

        let mounted = true
        setIsLoading(true)

        getSignedPhotoUrls(storagePaths).then((urlMap) => {
            if (mounted) {
                setUrls(urlMap)
                setIsLoading(false)
            }
        })

        return () => {
            mounted = false
        }
    }, [storagePaths.join(',')])

    return { urls, isLoading }
}
