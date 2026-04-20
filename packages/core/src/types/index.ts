// Domain types for ratemygig

// ============================================
// Enums
// ============================================

export type AttendanceStatus = 'planned' | 'attended';

export type Provider = 'mock' | 'ticketmaster' | 'songkick' | 'bandsintown';

// ============================================
// Base Types
// ============================================

export interface TicketUrl {
  label: string;
  url: string;
}

// ============================================
// Entities
// ============================================

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_profile_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number | null;
  lng: number | null;
  provider_venue_id: string | null;
  created_at: string;
}

export interface Artist {
  id: string;
  name: string;
  provider_artist_id: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  provider: Provider;
  provider_event_id: string;
  name: string;
  start_at: string;
  city: string;
  country: string;
  venue_id: string | null;
  venue?: Venue;
  ticket_urls: TicketUrl[];
  lineup: string[];
  created_at: string;
  updated_at: string;
}

export interface EventArtist {
  event_id: string;
  artist_id: string;
  billing_order: number | null;
  artist?: Artist;
}

export interface Attendance {
  id: string;
  user_id: string;
  event_id: string;
  status: AttendanceStatus;
  created_at: string;
  event?: Event;
}

export interface Review {
  id: string;
  user_id: string;
  event_id: string;
  rating: number;
  title: string | null;
  body: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  event?: Event;
  profile?: Profile;
  photos?: ReviewPhoto[];
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  storage_path: string;
  blurhash: string | null;
  created_at: string;
  url?: string;
}

export interface Tag {
  id: string;
  name: string;
  category: string | null;
}

export interface ReviewTag {
  review_id: string;
  tag_id: string;
  tag?: Tag;
}

// ============================================
// Aggregation Types
// ============================================

export interface RatingDistribution {
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

export interface RatingSummary {
  avg_rating: number;
  count_reviews: number;
  distribution: RatingDistribution;
  top_tags?: string[];
}

export interface VenueRatingSummary extends RatingSummary {
  venue_id: string;
  venue_name: string;
  city: string;
}

export interface ArtistRatingSummary extends RatingSummary {
  artist_id: string;
  artist_name: string;
}

// ============================================
// Filter Types
// ============================================

export interface RatingFilters {
  city?: string;
  year?: number;
  venue_id?: string;
  artist_id?: string;
}

export interface EventFilters {
  city?: string;
  country?: string;
  from?: string;
  to?: string;
  query?: string;
  venue_id?: string;
  artist_id?: string;
}

// ============================================
// Pagination
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// ============================================
// Social Types
// ============================================

export type ReactionType = 'like' | 'helpful' | 'love';

export interface ArtistFollow {
  id: string;
  user_id: string;
  artist_id: string;
  created_at: string;
}

export interface VenueFollow {
  id: string;
  user_id: string;
  venue_id: string;
  created_at: string;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface ReviewReaction {
  id: string;
  user_id: string;
  review_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionSummary {
  like: number;
  helpful: number;
  love: number;
}

export interface UserReactions {
  like: boolean;
  helpful: boolean;
  love: boolean;
}
