import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { createRateLimiter } from '@/shared/lib/throttle'
import { sanitizeText } from '@/shared/lib/sanitize'
import { RATE_LIMITS } from '@/shared/lib/constants'
import { getOrCreateSongId, isUniqueViolation } from './songs'
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

/** Toast copy for a failed save: never the raw database message. */
export function setlistSaveErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.startsWith('Please wait')) {
        return 'Give it a few seconds before saving again.'
    }
    if (error instanceof Error && error.message === 'Not authenticated') {
        return 'Sign in again to save the setlist.'
    }
    // Songs resolve their own conflicts, so a unique violation here is
    // UNIQUE(event_id, user_id): this user already has a setlist for the gig.
    if (isUniqueViolation(error)) {
        return 'You already have a setlist for this gig. Edit that one instead.'
    }
    return "Couldn't save the setlist. Try again."
}

const setlistCreateLimiter = createRateLimiter(RATE_LIMITS.SETLIST_CREATE)
const setlistMutationLimiter = createRateLimiter(RATE_LIMITS.SETLIST_CREATE)

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

/** Resolves every entry to a song id, creating each distinct (name, artist) at most once. */
async function resolveSongIds(songs: SetlistSongInput[]): Promise<string[]> {
    const resolved = new Map<string, string>()
    const ids: string[] = []

    for (const song of songs) {
        if (song.songId) {
            ids.push(song.songId)
            continue
        }

        const name = song.songName.trim()
        const artistId = song.artistId || null
        const key = `${artistId ?? ''}\u0000${name}`
        let id = resolved.get(key)
        if (!id) {
            id = await getOrCreateSongId(name, artistId)
            resolved.set(key, id)
        }
        ids.push(id)
    }

    return ids
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

            // Songs first: a failure here happens before any setlist row exists.
            const songIds = await resolveSongIds(input.songs)

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

            if (input.songs.length > 0) {
                const { error: ssError } = await supabase.from('setlist_songs').insert(
                    input.songs.map((songInput, i) => ({
                        setlist_id: setlist.id,
                        song_id: songIds[i],
                        position: songInput.position,
                        is_encore: songInput.isEncore ?? false,
                        is_debut: songInput.isDebut ?? false,
                        notes: songInput.notes ? sanitizeText(songInput.notes) : null,
                    }))
                )

                if (ssError) {
                    // The bulk insert is all-or-nothing; dropping the empty setlist
                    // too keeps UNIQUE(event_id, user_id) from blocking the retry.
                    await supabase.from('setlists').delete().eq('id', setlist.id)
                    throw ssError
                }
            }

            return setlist as Setlist
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: setlistKeys.byEvent(variables.eventId) })
            queryClient.invalidateQueries({ queryKey: setlistKeys.all })
        },
    })
}

/** A saved `setlist_songs` row, reduced to what editing can change. */
export type SavedSetlistSong = Pick<SetlistSong, 'id' | 'song_id' | 'position' | 'is_encore' | 'is_debut'>

/** An editor row on a saved setlist, matched to its row by `setlistSongId`. */
export interface EditedSetlistSong {
    setlistSongId?: string
    position: number
    isEncore: boolean
    isDebut: boolean
}

export interface SetlistSongUpdate {
    id: string
    position: number
    is_encore?: boolean
    is_debut?: boolean
}

export interface SetlistSongsDiff {
    /** Rows the editor no longer lists. */
    remove: string[]
    /** Row updates, to run in this order once `remove` is gone. */
    updates: SetlistSongUpdate[]
}

/**
 * The writes that turn a saved setlist's rows into the edited list: dropped
 * rows are removed and changed rows updated by id. Edit mode can't add songs,
 * so an entry with no saved row throws instead of being dropped; a row deleted
 * elsewhere in the meantime stays deleted.
 *
 * UNIQUE(setlist_id, song_id, position) only collides between plays of the
 * same song, and swapping two of those can't be ordered safely, so repeated
 * songs that move are parked above every current and target position first.
 */
export function diffSetlistSongs(saved: SavedSetlistSong[], edited: EditedSetlistSong[]): SetlistSongsDiff {
    const editedById = new Map<string, EditedSetlistSong>()
    for (const song of edited) {
        if (!song.setlistSongId) throw new Error('Songs can only be added before a setlist is saved')
        editedById.set(song.setlistSongId, song)
    }

    const kept = saved.flatMap(row => {
        const song = editedById.get(row.id)
        return song ? [{ row, song }] : []
    })
    const changed = kept.filter(
        ({ row, song }) =>
            song.position !== row.position || song.isEncore !== row.is_encore || song.isDebut !== row.is_debut
    )

    const plays = new Map<string, number>()
    for (const { row } of kept) plays.set(row.song_id, (plays.get(row.song_id) ?? 0) + 1)
    const parked = changed.filter(
        ({ row, song }) => song.position !== row.position && (plays.get(row.song_id) ?? 0) > 1
    )
    const firstFree = Math.max(-1, ...saved.map(row => row.position), ...edited.map(song => song.position)) + 1

    return {
        remove: saved.filter(row => !editedById.has(row.id)).map(row => row.id),
        updates: [
            ...parked.map(({ row }, i) => ({ id: row.id, position: firstFree + i })),
            ...changed.map(({ row, song }) => ({
                id: row.id,
                position: song.position,
                is_encore: song.isEncore,
                is_debut: song.isDebut,
            })),
        ],
    }
}

async function fetchSavedSetlistSongs(setlistId: string): Promise<SavedSetlistSong[]> {
    const { data, error } = await supabase
        .from('setlist_songs')
        .select('id, song_id, position, is_encore, is_debut')
        .eq('setlist_id', setlistId)

    if (error) throw error
    return data as SavedSetlistSong[]
}

async function applySetlistSongsDiff(setlistId: string, { remove, updates }: SetlistSongsDiff) {
    if (remove.length > 0) {
        const { error } = await supabase
            .from('setlist_songs')
            .delete()
            .eq('setlist_id', setlistId)
            .in('id', remove)

        if (error) throw error
    }

    for (const { id, ...values } of updates) {
        const { error } = await supabase
            .from('setlist_songs')
            .update(values)
            .eq('setlist_id', setlistId)
            .eq('id', id)

        if (error) throw error
    }
}

interface UpdateSetlistInput {
    setlistId: string
    notes?: string
    source?: 'manual' | 'verified'
    /** The whole edited list when songs can change; see diffSetlistSongs. */
    songs?: EditedSetlistSong[]
}

export function useUpdateSetlist() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ setlistId, notes, source, songs }: UpdateSetlistInput) => {
            if (!setlistMutationLimiter.allow()) {
                throw new Error('Please wait before updating setlists again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Diffed against the rows as they are now, so a retry after a
            // half-finished save carries on from where it stopped.
            const songChanges = songs
                ? diffSetlistSongs(await fetchSavedSetlistSongs(setlistId), songs)
                : undefined

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

            // Only the owner gets this far, and setlist_songs RLS lets owners write.
            if (songChanges) await applySetlistSongsDiff(setlistId, songChanges)

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
            if (!setlistMutationLimiter.allow()) {
                throw new Error('Please wait before deleting setlists again')
            }

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
            if (!setlistMutationLimiter.allow()) {
                throw new Error('Please wait before modifying setlists again')
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            const songId =
                input.songId || (await getOrCreateSongId(input.songName.trim(), input.artistId || null))

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
            if (!setlistMutationLimiter.allow()) {
                throw new Error('Please wait before modifying setlists again')
            }

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
            if (!setlistMutationLimiter.allow()) {
                throw new Error('Please wait before reordering setlists again')
            }

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