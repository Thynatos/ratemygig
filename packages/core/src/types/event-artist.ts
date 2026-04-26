import type { Artist } from './artist'

export interface EventArtist {
  event_id: string
  artist_id: string
  billing_order: number | null
  artist?: Artist
}
