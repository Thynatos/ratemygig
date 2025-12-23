-- ============================================
-- Database Indexes for Performance
-- Migration: 003_indexes.sql
-- ============================================

-- ============================================
-- EVENTS INDEXES
-- ============================================

-- For browsing events by city and date
CREATE INDEX IF NOT EXISTS idx_events_city_start_at 
  ON public.events (city, start_at);

-- For date range queries
CREATE INDEX IF NOT EXISTS idx_events_start_at 
  ON public.events (start_at);

-- For provider lookups
CREATE INDEX IF NOT EXISTS idx_events_provider_event_id 
  ON public.events (provider, provider_event_id);

-- For venue-based queries
CREATE INDEX IF NOT EXISTS idx_events_venue_id 
  ON public.events (venue_id);

-- ============================================
-- VENUES INDEXES
-- ============================================

-- For city-based venue browsing
CREATE INDEX IF NOT EXISTS idx_venues_city_name 
  ON public.venues (city, name);

-- ============================================
-- ARTISTS INDEXES
-- ============================================

-- For artist search
CREATE INDEX IF NOT EXISTS idx_artists_name 
  ON public.artists (name);

-- For text search on artist names
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm 
  ON public.artists USING gin (name gin_trgm_ops);

-- ============================================
-- EVENT_ARTISTS INDEXES
-- ============================================

-- For finding events by artist
CREATE INDEX IF NOT EXISTS idx_event_artists_artist_id 
  ON public.event_artists (artist_id);

-- ============================================
-- ATTENDANCE INDEXES
-- ============================================

-- For user's attendance list
CREATE INDEX IF NOT EXISTS idx_attendance_user_id 
  ON public.attendance (user_id);

-- For event attendance count
CREATE INDEX IF NOT EXISTS idx_attendance_event_id 
  ON public.attendance (event_id);

-- ============================================
-- REVIEWS INDEXES
-- ============================================

-- For event reviews
CREATE INDEX IF NOT EXISTS idx_reviews_event_id 
  ON public.reviews (event_id);

-- For user reviews
CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
  ON public.reviews (user_id);

-- For public review queries
CREATE INDEX IF NOT EXISTS idx_reviews_is_public 
  ON public.reviews (is_public) WHERE is_public = true;

-- Composite for event + public reviews
CREATE INDEX IF NOT EXISTS idx_reviews_event_public 
  ON public.reviews (event_id, is_public) WHERE is_public = true;

-- ============================================
-- REVIEW_PHOTOS INDEXES
-- ============================================

-- For review photo lookups
CREATE INDEX IF NOT EXISTS idx_review_photos_review_id 
  ON public.review_photos (review_id);

-- ============================================
-- PROFILES INDEXES
-- ============================================

-- For username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username 
  ON public.profiles (username) WHERE username IS NOT NULL;

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
