export type ReactionType = 'like' | 'helpful' | 'love'

export interface ArtistFollow {
  id: string
  user_id: string
  artist_id: string
  created_at: string
}

export interface VenueFollow {
  id: string
  user_id: string
  venue_id: string
  created_at: string
}

export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface ReviewReaction {
  id: string
  user_id: string
  review_id: string
  reaction_type: ReactionType
  created_at: string
}

export interface ReactionSummary {
  like: number
  helpful: number
  love: number
}

export interface UserReactions {
  like: boolean
  helpful: boolean
  love: boolean
}
