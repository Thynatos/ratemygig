import { useState, useEffect, useMemo } from 'react'
import { getSignedPhotoUrls } from '@/shared/lib/storage'

export function usePhotoUrls(storagePaths: string[], thumbnailPaths?: (string | null)[]) {
    const [urls, setUrls] = useState<Map<string, string>>(new Map())
    const [thumbUrls, setThumbUrls] = useState<Map<string, string>>(new Map())
    const [fetchKey, setFetchKey] = useState(0)

    const pathsKey = useMemo(() => storagePaths.join(','), [storagePaths])
    const pathsLength = storagePaths.length

    useEffect(() => {
        if (pathsLength === 0) return

        let cancelled = false

        // Fetch full-size URLs
        getSignedPhotoUrls(storagePaths).then((urlMap) => {
            if (!cancelled) {
                setUrls(urlMap)
                setFetchKey(k => k + 1)
            }
        })

        // Fetch thumbnail URLs if provided
        const validThumbPaths = thumbnailPaths?.filter((p): p is string => !!p) ?? []
        if (validThumbPaths.length > 0) {
            getSignedPhotoUrls(validThumbPaths).then((thumbMap) => {
                if (!cancelled) {
                    setThumbUrls(thumbMap)
                }
            })
        }

        return () => {
            cancelled = true
        }
    }, [pathsKey, pathsLength, storagePaths, thumbnailPaths])

    const resolvedUrls = pathsLength === 0 ? new Map<string, string>() : urls
    const resolvedLoading = pathsLength === 0 ? false : fetchKey === 0 && pathsLength > 0

    return { urls: resolvedUrls, thumbUrls, isLoading: resolvedLoading }
}