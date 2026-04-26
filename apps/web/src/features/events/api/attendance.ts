import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'

export function useAttendance(eventId: string) {
    return useQuery({
        queryKey: ['attendance', eventId],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return null

            const { data, error } = await supabase
                .from('attendance')
                .select('*')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (error && error.code !== 'PGRST116') throw error
            return data
        },
        enabled: !!eventId,
    })
}

const attendanceLimiter = createRateLimiter(RATE_LIMITS.ATTENDANCE)

export function useToggleAttendance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ eventId, status }: { eventId: string; status: 'planned' | 'attended' }) => {
            if (!attendanceLimiter.allow()) {
                throw new Error('Please wait before updating attendance')
            }
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: existing } = await supabase
                .from('attendance')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .maybeSingle()

            if (existing) {
                const { error } = await supabase
                    .from('attendance')
                    .update({ status })
                    .eq('id', existing.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('attendance')
                    .insert({ event_id: eventId, user_id: user.id, status })
                if (error) throw error
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance', variables.eventId] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}

export function useRemoveAttendance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (eventId: string) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: (_data, eventId) => {
            queryClient.invalidateQueries({ queryKey: ['attendance', eventId] })
            queryClient.invalidateQueries({ queryKey: ['my-gigs'] })
        },
    })
}
