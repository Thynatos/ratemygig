-- ============================================
-- Row Level Security Policies
-- Migration: 002_rls_policies.sql
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_tags ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view public profiles or their own
CREATE POLICY "Profiles are viewable by everyone if public or own"
  ON public.profiles FOR SELECT
  USING (is_profile_public = true OR auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- VENUES POLICIES (Read-only for all)
-- ============================================

CREATE POLICY "Venues are viewable by everyone"
  ON public.venues FOR SELECT
  USING (true);

-- Only service role can insert/update venues
CREATE POLICY "Service role can manage venues"
  ON public.venues FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- ARTISTS POLICIES (Read-only for all)
-- ============================================

CREATE POLICY "Artists are viewable by everyone"
  ON public.artists FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage artists"
  ON public.artists FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- EVENTS POLICIES (Read-only for all)
-- ============================================

CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage events"
  ON public.events FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- EVENT_ARTISTS POLICIES (Read-only for all)
-- ============================================

CREATE POLICY "Event artists are viewable by everyone"
  ON public.event_artists FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage event artists"
  ON public.event_artists FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- ATTENDANCE POLICIES (User-only)
-- ============================================

CREATE POLICY "Users can view own attendance"
  ON public.attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance"
  ON public.attendance FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attendance"
  ON public.attendance FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- REVIEWS POLICIES
-- ============================================

-- Public reviews are viewable by everyone, private only by owner
CREATE POLICY "Public reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- REVIEW_PHOTOS POLICIES
-- ============================================

-- Photos viewable if parent review is public or user owns it
CREATE POLICY "Review photos are viewable based on review visibility"
  ON public.review_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id
      AND (r.is_public = true OR r.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert photos for own reviews"
  ON public.review_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos from own reviews"
  ON public.review_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

-- ============================================
-- TAGS POLICIES (Read-only for all)
-- ============================================

CREATE POLICY "Tags are viewable by everyone"
  ON public.tags FOR SELECT
  USING (true);

-- ============================================
-- REVIEW_TAGS POLICIES
-- ============================================

CREATE POLICY "Review tags are viewable based on review visibility"
  ON public.review_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id
      AND (r.is_public = true OR r.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage tags for own reviews"
  ON public.review_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tags from own reviews"
  ON public.review_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews r
      WHERE r.id = review_id AND r.user_id = auth.uid()
    )
  );
