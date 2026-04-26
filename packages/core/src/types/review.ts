import type { Event } from './event'
import type { Profile } from './profile'

export type ReviewStatus = 'draft' | 'published'

export interface Review {
  id: string
  user_id: string
  event_id: string
  rating: number
  title: string | null
  body: string
  is_public: boolean
  status: ReviewStatus
  created_at: string
  updated_at: string
  event?: Event
  profile?: Profile
  photos?: ReviewPhoto[]
}

export interface ReviewPhoto {
  id: string
  review_id: string
  storage_path: string
  blurhash: string | null
  created_at: string
  url?: string
}

export interface Tag {
  id: string
  name: string
  category: string | null
}

export interface ReviewTag {
  review_id: string
  tag_id: string
  tag?: Tag
}
