import { useEffect, useRef, useCallback, useState } from 'react'

interface UseInfiniteScrollOptions {
    onLoadMore: () => void
    hasMore: boolean
    isLoading: boolean
    threshold?: number
    rootMargin?: string
}

export function useInfiniteScroll({
    onLoadMore,
    hasMore,
    isLoading,
    threshold = 0.1,
    rootMargin = '100px',
}: UseInfiniteScrollOptions) {
    const observerRef = useRef<IntersectionObserver | null>(null)
    const [loadMoreRef, setLoadMoreRef] = useState<HTMLElement | null>(null)

    const handleIntersection = useCallback(
        (entries: IntersectionObserverEntry[]) => {
            const [entry] = entries
            if (entry.isIntersecting && hasMore && !isLoading) {
                onLoadMore()
            }
        },
        [onLoadMore, hasMore, isLoading]
    )

    useEffect(() => {
        if (observerRef.current) {
            observerRef.current.disconnect()
        }

        if (!loadMoreRef) return

        observerRef.current = new IntersectionObserver(handleIntersection, {
            threshold,
            rootMargin,
        })

        observerRef.current.observe(loadMoreRef)

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect()
            }
        }
    }, [loadMoreRef, handleIntersection, threshold, rootMargin])

    return { setLoadMoreRef }
}
