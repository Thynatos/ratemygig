export interface UserPreferences {
  id: string
  user_id: string
  preferred_city: string | null
  preferred_lat: number | null
  preferred_lng: number | null
  created_at: string
  updated_at: string
}

export type NotificationType = 'event_reminder' | 'new_review' | 'artist_event' | 'venue_event'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export type RecommendationReason = 'followed_artist' | 'followed_venue' | 'preferred_city' | 'trending'
