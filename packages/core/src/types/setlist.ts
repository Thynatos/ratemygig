export interface Song {
  id: string
  name: string
  artist_id: string | null
  created_at: string
}

export interface Setlist {
  id: string
  event_id: string
  user_id: string
  source: 'manual' | 'verified'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SetlistSong {
  id: string
  setlist_id: string
  song_id: string
  position: number
  is_encore: boolean
  is_debut: boolean
  notes: string | null
  created_at: string
}

export interface SetlistWithSongs extends Setlist {
  songs: (SetlistSong & { song: Song })[]
  profile: { id: string; display_name: string | null; username: string | null; avatar_url: string | null } | null
  event: { id: string; name: string; start_at: string } | null
}
