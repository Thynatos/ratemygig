import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { sanitizeText } from '@/shared/lib/sanitize'
import { createRateLimiter } from '@/shared/lib/throttle'
import { RATE_LIMITS } from '@/shared/lib/constants'
import { generateId } from '@/shared/lib/utils'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { List, ListItem, Event } from '@core/index'

export const listKeys = {
    all: ['lists'] as const,
    byUser: (userId: string) => [...listKeys.all, 'user', userId] as const,
    detail: (id: string) => [...listKeys.all, 'detail', id] as const,
    event: (eventId: string) => [...listKeys.all, 'event', eventId] as const,
}

export interface ListWithItemCount extends List {
    item_count: number
}

export interface ListItemWithEvent extends ListItem {
    event: Event | null
}

export interface ListWithItems extends List {
    items: ListItemWithEvent[]
    profile: {
        id: string
        display_name: string | null
        username: string | null
        avatar_url: string | null
    } | null
}

export function applyEventListToggle(listIds: string[], listId: string): string[] {
    return listIds.includes(listId)
        ? listIds.filter((id) => id !== listId)
        : [...listIds, listId]
}

export function applyListItemAdded(list: ListWithItems, item: ListItemWithEvent): ListWithItems {
    return {
        ...list,
        items: [...list.items, item].sort((a, b) => a.position - b.position),
    }
}

export function applyListItemRemoved(list: ListWithItems, eventId: string): ListWithItems {
    return {
        ...list,
        items: list.items.filter((item) => item.event_id !== eventId),
    }
}

export function applyListItemCountDelta(lists: ListWithItemCount[], listId: string, delta: number): ListWithItemCount[] {
    return lists.map((list) =>
        list.id === listId
            ? { ...list, item_count: Math.max(0, list.item_count + delta) }
            : list
    )
}

export function useUserLists(userId: string) {
    return useQuery({
        queryKey: listKeys.byUser(userId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lists')
                .select('*, list_items(count)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data as (List & { list_items: { count: number }[] })[]).map((row) => ({
                ...row,
                item_count: row.list_items?.[0]?.count ?? 0,
                list_items: undefined,
            })) as ListWithItemCount[]
        },
        enabled: !!userId,
    })
}

export function useList(listId: string) {
    return useQuery({
        queryKey: listKeys.detail(listId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('lists')
                .select(`
                    *,
                    profile:profiles(id, display_name, username, avatar_url),
                    items:list_items(*, event:events(*, venue:venues(*)))
                `)
                .eq('id', listId)
                .single()

            if (error) throw error

            const sortedItems = [...(data.items || [])].sort(
                (a: ListItem, b: ListItem) => a.position - b.position
            )

            return {
                ...data,
                items: sortedItems,
            } as ListWithItems
        },
        enabled: !!listId,
    })
}

export function useEventLists(eventId: string) {
    return useQuery({
        queryKey: listKeys.event(eventId),
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return []

            const { data, error } = await supabase
                .from('list_items')
                .select('list_id')
                .eq('event_id', eventId)

            if (error) throw error

            const listIds = data.map((d: { list_id: string }) => d.list_id)
            return listIds as string[]
        },
        enabled: !!eventId,
    })
}

const listCreateLimiter = createRateLimiter(RATE_LIMITS.LIST_CREATE)
const listMutationLimiter = createRateLimiter(RATE_LIMITS.LIST_CREATE)
const listItemLimiter = createRateLimiter(RATE_LIMITS.LIST_ITEM)

export function useCreateList() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: { name: string; description?: string; is_public: boolean }) => {
            if (!listCreateLimiter.allow()) {
                throw new Error('Please wait before creating another list')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data, error } = await supabase
                .from('lists')
                .insert({
                    user_id: user.id,
                    name: sanitizeText(input.name),
                    description: input.description ? sanitizeText(input.description) : null,
                    is_public: input.is_public,
                })
                .select()
                .single()

            if (error) throw error
            return data as List
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: listKeys.all })
        },
    })
}

export function useUpdateList() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ listId, ...input }: {
            listId: string
            name?: string
            description?: string
            is_public?: boolean
        }) => {
            if (!listMutationLimiter.allow()) {
                throw new Error('Please wait before updating lists again')
            }

            const updates: Record<string, unknown> = {}
            if (input.name !== undefined) updates.name = sanitizeText(input.name)
            if (input.description !== undefined) updates.description = sanitizeText(input.description)
            if (input.is_public !== undefined) updates.is_public = input.is_public

            const { data, error } = await supabase
                .from('lists')
                .update(updates)
                .eq('id', listId)
                .select()
                .single()

            if (error) throw error
            return data as List
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: listKeys.detail(data.id) })
            queryClient.invalidateQueries({ queryKey: listKeys.all })
        },
    })
}

export function useDeleteList() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (listId: string) => {
            if (!listMutationLimiter.allow()) {
                throw new Error('Please wait before deleting lists again')
            }

            const { error } = await supabase
                .from('lists')
                .delete()
                .eq('id', listId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: listKeys.all })
        },
    })
}

export function useAddEventToList() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ listId, eventId }: { listId: string; eventId: string }) => {
            if (!listItemLimiter.allow()) {
                throw new Error('Please wait before modifying lists again')
            }

            const { count } = await supabase
                .from('list_items')
                .select('id', { count: 'exact', head: true })
                .eq('list_id', listId)

            const { data, error } = await supabase
                .from('list_items')
                .insert({
                    list_id: listId,
                    event_id: eventId,
                    position: (count ?? 0),
                })
                .select()
                .single()

            if (error) throw error
            return data as ListItem
        },
        onMutate: async ({ listId, eventId }) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: listKeys.event(eventId) }),
                queryClient.cancelQueries({ queryKey: listKeys.detail(listId) }),
                ...(user ? [queryClient.cancelQueries({ queryKey: listKeys.byUser(user.id) })] : []),
            ])

            const prevEventLists = queryClient.getQueryData<string[]>(listKeys.event(eventId))
            const prevList = queryClient.getQueryData<ListWithItems>(listKeys.detail(listId))
            const prevUserLists = user
                ? queryClient.getQueryData<ListWithItemCount[]>(listKeys.byUser(user.id))
                : undefined

            if (prevEventLists) {
                queryClient.setQueryData(listKeys.event(eventId), applyEventListToggle(prevEventLists, listId))
            }
            if (prevList) {
                queryClient.setQueryData(listKeys.detail(listId), applyListItemAdded(prevList, {
                    id: generateId(),
                    list_id: listId,
                    event_id: eventId,
                    notes: null,
                    position: prevList.items.length,
                    created_at: new Date().toISOString(),
                    event: null,
                }))
            }
            if (prevUserLists && user) {
                queryClient.setQueryData(listKeys.byUser(user.id), applyListItemCountDelta(prevUserLists, listId, 1))
            }

            return { prevEventLists, prevList, prevUserLists, userId: user?.id }
        },
        onError: (_err, { listId, eventId }, ctx) => {
            if (!ctx) return
            if (ctx.prevEventLists) {
                queryClient.setQueryData(listKeys.event(eventId), ctx.prevEventLists)
            }
            if (ctx.prevList) {
                queryClient.setQueryData(listKeys.detail(listId), ctx.prevList)
            }
            if (ctx.prevUserLists && ctx.userId) {
                queryClient.setQueryData(listKeys.byUser(ctx.userId), ctx.prevUserLists)
            }
        },
        onSettled: (_data, _err, { listId, eventId }) => {
            queryClient.invalidateQueries({ queryKey: listKeys.detail(listId) })
            queryClient.invalidateQueries({ queryKey: listKeys.all })
            queryClient.invalidateQueries({ queryKey: listKeys.event(eventId) })
        },
    })
}

export function useRemoveEventFromList() {
    const queryClient = useQueryClient()
    const { user } = useAuth()

    return useMutation({
        mutationFn: async ({ listId, eventId }: { listId: string; eventId: string }) => {
            if (!listItemLimiter.allow()) {
                throw new Error('Please wait before modifying lists again')
            }

            const { error } = await supabase
                .from('list_items')
                .delete()
                .eq('list_id', listId)
                .eq('event_id', eventId)

            if (error) throw error
        },
        onMutate: async ({ listId, eventId }) => {
            await Promise.all([
                queryClient.cancelQueries({ queryKey: listKeys.event(eventId) }),
                queryClient.cancelQueries({ queryKey: listKeys.detail(listId) }),
                ...(user ? [queryClient.cancelQueries({ queryKey: listKeys.byUser(user.id) })] : []),
            ])

            const prevEventLists = queryClient.getQueryData<string[]>(listKeys.event(eventId))
            const prevList = queryClient.getQueryData<ListWithItems>(listKeys.detail(listId))
            const prevUserLists = user
                ? queryClient.getQueryData<ListWithItemCount[]>(listKeys.byUser(user.id))
                : undefined

            if (prevEventLists) {
                queryClient.setQueryData(listKeys.event(eventId), applyEventListToggle(prevEventLists, listId))
            }
            if (prevList) {
                queryClient.setQueryData(listKeys.detail(listId), applyListItemRemoved(prevList, eventId))
            }
            if (prevUserLists && user) {
                queryClient.setQueryData(listKeys.byUser(user.id), applyListItemCountDelta(prevUserLists, listId, -1))
            }

            return { prevEventLists, prevList, prevUserLists, userId: user?.id }
        },
        onError: (_err, { listId, eventId }, ctx) => {
            if (!ctx) return
            if (ctx.prevEventLists) {
                queryClient.setQueryData(listKeys.event(eventId), ctx.prevEventLists)
            }
            if (ctx.prevList) {
                queryClient.setQueryData(listKeys.detail(listId), ctx.prevList)
            }
            if (ctx.prevUserLists && ctx.userId) {
                queryClient.setQueryData(listKeys.byUser(ctx.userId), ctx.prevUserLists)
            }
        },
        onSettled: (_data, _err, { listId, eventId }) => {
            queryClient.invalidateQueries({ queryKey: listKeys.detail(listId) })
            queryClient.invalidateQueries({ queryKey: listKeys.all })
            queryClient.invalidateQueries({ queryKey: listKeys.event(eventId) })
        },
    })
}

export function useReorderListItems() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ items }: {
            listId: string
            items: { id: string; position: number }[]
        }) => {
            if (!listMutationLimiter.allow()) {
                throw new Error('Please wait before reordering lists again')
            }

            const updates = items.map((item) =>
                supabase
                    .from('list_items')
                    .update({ position: item.position })
                    .eq('id', item.id)
            )

            await Promise.all(updates)
        },
        onMutate: async ({ listId, items }) => {
            await queryClient.cancelQueries({ queryKey: listKeys.detail(listId) })

            const prev = queryClient.getQueryData<ListWithItems>(listKeys.detail(listId))
            if (prev) {
                const updated = {
                    ...prev,
                    items: prev.items.map((item) => {
                        const updatedItem = items.find((i) => i.id === item.id)
                        return updatedItem ? { ...item, position: updatedItem.position } : item
                    }).sort((a, b) => a.position - b.position),
                }
                queryClient.setQueryData(listKeys.detail(listId), updated)
            }

            return { prev }
        },
        onError: (_err, { listId }, ctx) => {
            if (ctx?.prev) {
                queryClient.setQueryData(listKeys.detail(listId), ctx.prev)
            }
        },
        onSuccess: (_data, { listId }) => {
            queryClient.invalidateQueries({ queryKey: listKeys.detail(listId) })
            queryClient.invalidateQueries({ queryKey: listKeys.all })
        },
    })
}
