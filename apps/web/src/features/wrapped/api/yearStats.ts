import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { validateRpcResponse } from '@/shared/lib/utils'
import { yearStatsSchema } from '@/shared/validation/schemas'
import type { UserYearStats } from '@core/index'

export const yearStatsKeys = {
    detail: (userId: string, year: number) => ['wrapped', userId, year] as const,
}

export const MIN_WRAPPED_YEAR = 2000

export function resolveWrappedYear(param: string | null, now: Date = new Date()): number {
    const currentYear = now.getFullYear()
    const fallback = now.getMonth() === 0 ? currentYear - 1 : currentYear

    if (param !== null) {
        const parsed = Number.parseInt(param, 10)
        if (Number.isFinite(parsed) && String(parsed) === param.trim() && parsed >= MIN_WRAPPED_YEAR && parsed <= currentYear) {
            return parsed
        }
    }
    return fallback
}

export function useYearStats(userId: string | undefined, year: number) {
    return useQuery({
        queryKey: yearStatsKeys.detail(userId ?? '', year),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_user_year_stats', {
                p_user_id: userId,
                p_year: year,
            })

            if (error) throw error
            if (!data || data.length === 0) return null
            return validateRpcResponse(yearStatsSchema, data[0], 'get_user_year_stats') as UserYearStats
        },
        enabled: !!userId && Number.isFinite(year),
        staleTime: 5 * 60 * 1000,
    })
}
