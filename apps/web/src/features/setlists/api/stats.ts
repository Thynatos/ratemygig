import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabase'
import { setlistKeys } from './setlists'

export const setlistStatsKeys = {
    artistSongs: (artistId: string) => [...setlistKeys.all, 'artist-songs', artistId] as const,
    artistStats: (artistId: string) => [...setlistKeys.all, 'artist-stats', artistId] as const,
    songStats: (songId: string) => [...setlistKeys.all, 'song-stats', songId] as const,
}

export interface ArtistSongStats {
    song_id: string
    song_name: string
    play_count: number
    last_played: string
}

export interface ArtistSetlistStats {
    setlist_count: number
    avg_song_count: number
    total_unique_songs: number
}

export interface SongStatsEntry {
    artist_id: string
    artist_name: string
    play_count: number
    first_played: string
    last_played: string
}

export function useArtistSongStats(artistId: string) {
    return useQuery({
        queryKey: setlistStatsKeys.artistSongs(artistId),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_artist_song_stats', {
                p_artist_id: artistId,
                p_limit: 20,
            })

            if (error) throw error
            return (data || []) as ArtistSongStats[]
        },
        enabled: !!artistId,
    })
}

export function useArtistSetlistStats(artistId: string) {
    return useQuery({
        queryKey: setlistStatsKeys.artistStats(artistId),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_artist_setlist_stats', {
                p_artist_id: artistId,
            })

            if (error) throw error
            return (data?.[0] ?? null) as ArtistSetlistStats | null
        },
        enabled: !!artistId,
    })
}

export function useSongStats(songId: string) {
    return useQuery({
        queryKey: setlistStatsKeys.songStats(songId),
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_song_stats', {
                p_song_id: songId,
            })

            if (error) throw error
            return (data || []) as SongStatsEntry[]
        },
        enabled: !!songId,
    })
}