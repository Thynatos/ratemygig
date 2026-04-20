import { useState, useEffect, useMemo } from 'react'
import { getSignedPhotoUrls } from '@/shared/lib/storage'

export function usePhotoUrls(storagePaths: string[]) {
    const [urls, setUrls] = useState<Map<string, string>>(new Map())
    const [fetchKey, setFetchKey] = useState(0)

    const pathsKey = useMemo(() => storagePaths.join(','), [storagePaths])
    const pathsLength = storagePaths.length

    useEffect(() => {
        if (pathsLength === 0) return

        let cancelled = false
        getSignedPhotoUrls(storagePaths).then((urlMap) => {
            if (!cancelled) {
                setUrls(urlMap)
                setFetchKey(k => k + 1)
            }
        })

        return () => {
            cancelled = true
        }
    }, [pathsKey, pathsLength, storagePaths])

    const resolvedUrls = pathsLength === 0 ? new Map<string, string>() : urls
    const resolvedLoading = pathsLength === 0 ? false : fetchKey === 0 && pathsLength > 0

    return { urls: resolvedUrls, isLoading: resolvedLoading }
}