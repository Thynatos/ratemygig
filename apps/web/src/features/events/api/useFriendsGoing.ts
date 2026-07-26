import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabase'
import { isSupabaseConfigured } from '@/shared/lib/env'
import { validateRpcResponse } from '@/shared/lib/utils'
import { friendsAttendanceRowSchema } from '@/shared/validation/schemas'
import { useAuth } from '@/features/auth/hooks/useAuth'

export interface FriendGoing {
    userId: string
    displayName: string
    avatarUrl: string | null
}

export interface FriendsAttendanceRow {
    event_id: string
    user_id: string
    display_name: string | null
    avatar_url: string | null
}

export const friendsGoingKeys = {
    all: ['friends-going'] as const,
    events: (eventIds: string[]) => [...friendsGoingKeys.all, 'events', [...eventIds].sort()] as const,
}

export function groupFriendsByEvent(rows: FriendsAttendanceRow[]): Map<string, FriendGoing[]> {
    const grouped = new Map<string, FriendGoing[]>()
    for (const row of rows) {
        const friend: FriendGoing = {
            userId: row.user_id,
            displayName: row.display_name ?? 'Friend',
            avatarUrl: row.avatar_url,
        }
        const existing = grouped.get(row.event_id)
        if (existing) {
            existing.push(friend)
        } else {
            grouped.set(row.event_id, [friend])
        }
    }
    return grouped
}

export function useFriendsGoing(eventIds: string[]) {
    const { user } = useAuth()
    const sortedIds = [...eventIds].sort()

    return useQuery({
        queryKey: friendsGoingKeys.events(sortedIds),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_friends_attendance', {
                p_user_id: user!.id,
                p_event_ids: sortedIds,
            })

            if (error) throw error

            const rows = validateRpcResponse(
                z.array(friendsAttendanceRowSchema),
                data || [],
                'get_friends_attendance'
            )
            return groupFriendsByEvent(rows)
        },
        enabled: !!user && sortedIds.length > 0 && isSupabaseConfigured(),
    })
}
