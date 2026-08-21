import { QueryClient } from '@tanstack/react-query'
import { STALE_TIMES, QUERY_DEFAULTS } from '@/shared/lib/constants'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: STALE_TIMES.DEFAULT,
            retry: QUERY_DEFAULTS.RETRY,
            refetchOnWindowFocus: false,
        },
    },
})
