export interface RatingDistribution {
  rating_1: number
  rating_2: number
  rating_3: number
  rating_4: number
  rating_5: number
}

export interface RatingSummary extends RatingDistribution {
  avg_rating: number
  count_reviews: number
}

export interface VenueRatingSummary extends RatingSummary {
  venue_id: string
  venue_name: string
  city: string
}

export interface ArtistRatingSummary extends RatingSummary {
  artist_id: string
  artist_name: string
}

export interface RatingFilters {
  city?: string
  year?: number
  venue_id?: string
  artist_id?: string
}
