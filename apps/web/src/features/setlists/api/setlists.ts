import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { createRateLimiter } from '@/shared/lib/throttle'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { Setlist, SetlistSong, SetlistWithSongs, Song } from '@core/index'

export const setlistKeys = {
    all: ['setlists'] as const,
    byEvent: (eventId: string) => [...setlistKeys.all, 'event', eventId] as const,
    detail: (id: string) => [...setlistKeys.all, 'detail', id] as const,
    byUser: (userId: string) => [...setlistKeys.all, 'user', userId] as const,
}

export function useEventSetlists(eventId: string) {
    return useQuery({
        queryKey: setlistKeys.byEvent(eventId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('setlists')
                .select(`
                    *,
                    songs:setlist_songs(
                        *,
                        song:songs(*)
                    ),
                    profile:profiles(id, display_name, username, avatar_url)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data as unknown as SetlistWithSongs[]).map(sl => ({
                ...sl,
                songs: (sl.songs || [])
                    .sort((a: SetlistSong, b: SetlistSong) => a.position - b.position),
            }))
        },
        enabled: !!eventId,
    })
}

export function useSetlist(id: string) {
    return useQuery({
        queryKey: setlistKeys.detail(id),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('setlists')
                .select(`
                    *,
                    songs:setlist_songs(
                        *,
                        song:songs(*)
                    ),
                    profile:profiles(id, display_name, username, avatar_url),
                    event:events(id, name, start_at)
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            const result = data as unknown as SetlistWithSongs
            return {
                ...result,
                songs: (result.songs || [])
                    .sort((a: SetlistSong, b: SetlistSong) => a.position - b.position),
            }
        },
        enabled: !!id,
    })
}

export function useMySetlists() {
    const { user } = useAuth()

    return useQuery({
        queryKey: setlistKeys.byUser(user?.id ?? ''),
        queryFn: async () => {
            if (!user) return []

            const { data, error } = await supabase
                .from('setlists')
                .select(`
                    *,
                    songs:setlist_songs(
                        *,
                        song:songs(*)
                    ),
                    event:events(id, name, start_at)
                `)
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })

            if (error) throw error

            return (data as unknown as SetlistWithSongs[]).map(sl => ({
                ...sl,
                songs: (sl.songs || [])
                    .sort((a: SetlistSong, b: SetlistSong) => a.position - b.position),
            }))
        },
        enabled: !!user,
    })
}

const setlistCreateLimiter = createRateLimiter(5000)

interface SetlistSongInput {
    songId?: string
    songName: string
    artistId?: string
    position: number
    isEncore?: boolean
    isDebut?: boolean
    notes?: string
}

interface CreateSetlistInput {
    eventId: string
    songs: SetlistSongInput[]
    notes?: string
    source?: 'manual' | 'verified'
}

export function useCreateSetlist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateSetlistInput) => {
            if (!setlistCreateLimiter.allow()) {
                throw new Error('Please wait before creating another setlist')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: setlist, error: setlistError } = await supabase
                .from('setlists')
                .insert({
                    event_id: input.eventId,
                    user_id: user.id,
                    source: input.source ?? 'manual',
                    notes: input.notes ? sanitizeText(input.notes) : null,
                })
                .select()
                .single()

            if (setlistError) throw setlistError

            const setlistId = setlist.id

            for (const songInput of input.songs) {
                let songId = songInput.songId

                if (!songId) {
                    const { data: existingSong } = await supabase
                        .from('songs')
                        .select('id')
                        .eq('name', songInput.songName.trim())
                        .is('artist_id', songInput.artistId || null)
                        .maybeSingle()

                    if (existingSong) {
                        songId = existingSong.id
                    } else {
                        const { data: newSong, error: songError } = await supabase
                            .from('songs')
                            .insert({
                                name: songInput.songName.trim(),
                                artist_id: songInput.artistId || null,
                            })
                            .select()
                            .single()

                        if (songError) throw songError
                        songId = newSong.id
                    }
                }

                const { error: ssError } = await supabase
                    .from('setlist_songs')
                    .insert({
                        setlist_id: setlistId,
                        song_id: songId,
                        position: songInput.position,
                        is_encore: songInput.isEncore ?? false,
                        is_debut: songInput.isDebut ?? false,
                        notes: songInput.notes ? sanitizeText(songInput.notes) : null,
                    })

                if (ssError) throw ssError
            }

            return setlist as Setlist
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: setlistKeys.byEvent(variables.eventId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.all })
        },
    })
}

interface UpdateSetlistInput {
    setlistId: string
    notes?: string
    source?: 'manual' | 'verified'
}

export function useUpdateSetlist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ setlistId, notes, source }: UpdateSetlistInput) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const updateData: Record<string, unknown> = {}
            if (notes !== undefined) updateData.notes = notes ? sanitizeText(notes) : null
            if (source !== undefined) updateData.source = source

            const { data, error } = await supabase
                .from('setlists')
                .update(updateData)
                .eq('id', setlistId)
                .eq('user_id', user.id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            const setlist = data as Setlist
            queryClient.invalidateQueries({ queryKey: setlistKeys.detail(setlist.id) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.byEvent(setlist.event_id) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.all })
        },
    })
}

export function useDeleteSetlist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ setlistId }: { setlistId: string; eventId: string }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { error } = await supabase
                .from('setlists')
                .delete()
                .eq('id', setlistId)
                .eq('user_id', user.id)

            if (error) throw error
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: setlistKeys.byEvent(variables.eventId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.detail(variables.setlistId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.all })
        },
    })
}

interface AddSongInput {
    setlistId: string
    songId?: string
    songName: string
    artistId?: string
    position: number
    isEncore?: boolean
    isDebut?: boolean
    notes?: string
}

export function useAddSong() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: AddSongInput) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            let songId = input.songId

            if (!songId) {
                const { data: existingSong } = await supabase
                    .from('songs')
                    .select('id')
                    .eq('name', input.songName.trim())
                    .is('artist_id', input.artistId || null)
                    .maybeSingle()

                if (existingSong) {
                    songId = existingSong.id
                } else {
                    const { data: newSong, error: songError } = await supabase
                        .from('songs')
                        .insert({
                            name: input.songName.trim(),
                            artist_id: input.artistId || null,
                        })
                        .select()
                        .single()

                    if (songError) throw songError
                    songId = newSong.id
                }
            }

            const { data, error } = await supabase
                .from('setlist_songs')
                .insert({
                    setlist_id: input.setlistId,
                    song_id: songId,
                    position: input.position,
                    is_encore: input.isEncore ?? false,
                    is_debut: input.isDebut ?? false,
                    notes: input.notes ? sanitizeText(input.notes) : null,
                })
                .select()
                .single()

            if (error) throw error
            return data as SetlistSong & { song: Song }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: setlistKeys.detail(variables.setlistId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.all })
        },
    })
}

export function useRemoveSong() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ setlistSongId, setlistId }: { setlistSongId: string; setlistId: string }) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const { data: setlistSongs, error: fetchError } = await supabase
                .from('setlist_songs')
                .select('id, position')
                .eq('setlist_id', setlistId)
                .order('position')

            if (fetchError) throw fetchError

            const { error } = await supabase
                .from('setlist_songs')
                .delete()
                .eq('id', setlistSongId)

            if (error) throw error

            const remaining = (setlistSongs as { id: string; position: number }[])
                .filter(s => s.id !== setlistSongId)

            for (let i = 0; i < remaining.length; i++) {
                await supabase
                    .from('setlist_songs')
                    .update({ position: i })
                    .eq('id', remaining[i].id)
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: setlistKeys.detail(variables.setlistId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.all })
        },
    })
}

interface ReorderInput {
    setlistId: string
    songs: { id: string; position: number; is_encore?: boolean; is_debut?: boolean }[]
}

export function useReorderSongs() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ songs }: ReorderInput) => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            for (const song of songs) {
                const { error } = await supabase
                    .from('setlist_songs')
                    .update({
                        position: song.position,
                        ...(song.is_encore !== undefined && { is_encore: song.is_encore }),
                        ...(song.is_debut !== undefined && { is_debut: song.is_debut }),
                    })
                    .eq('id', song.id)

                if (error) throw error
            }
        },
        onMutate: async ({ setlistId, songs }) => {
            await queryClient.cancelQueries({ queryKey: setlistKeys.detail(setlistId) })
            const prev = queryClient.getQueryData<SetlistWithSongs>(setlistKeys.detail(setlistId))

            if (prev) {
                const positionMap = new Map(songs.map(s => [s.id, s]))
                const updatedSongs = prev.songs.map(ss => {
                    const update = positionMap.get(ss.id)
                    if (update) {
                        return {
                            ...ss,
                            position: update.position,
                            ...(update.is_encore !== undefined && { is_encore: update.is_encore }),
                            ...(update.is_debut !== undefined && { is_debut: update.is_debut }),
                        }
                    }
                    return ss
                }).sort((a, b) => a.position - b.position)

                queryClient.setQueryData(setlistKeys.detail(setlistId), { ...prev, songs: updatedSongs })
            }

            return { prev }
        },
        onError: (_err, variables, ctx) => {
            if (ctx?.prev) {
                queryClient.setQueryData(setlistKeys.detail(variables.setlistId), ctx.prev)
            }
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: setlistKeys.detail(variables.setlistId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.byEvent(variables.setlistId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.all })
        },
    })
}