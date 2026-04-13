import { useState, useEffect, useMemo, useRef } from 'react'
import { getSignedPhotoUrls } from '@/shared/lib/storage'

export function usePhotoUrls(storagePaths: string[]) {
    const [urls, setUrls] = useState<Map<string, string>>(new Map())
    const [isLoading, setIsLoading] = useState(false)
    const mountedRef = useRef(true)

    const pathsKey = useMemo(() => storagePaths.join(','), [storagePaths])

    useEffect(() => {
        mountedRef.current = true

        if (storagePaths.length === 0) {
            return
        }

        getSignedPhotoUrls(storagePaths).then((urlMap) => {
            if (mountedRef.current) {
                setUrls(urlMap)
                setIsLoading(false)
            }
        })

        return () => {
            mountedRef.current = false
        }
    }, [pathsKey, storagePaths])

    const resolvedUrls = storagePaths.length === 0 ? new Map<string, string>() : urls
    const resolvedLoading = storagePaths.length === 0 ? false : isLoading

    return { urls: resolvedUrls, isLoading: resolvedLoading }
}