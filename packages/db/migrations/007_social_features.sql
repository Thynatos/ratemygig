-- ============================================
-- Social Features: Follows & Reactions
-- Migration: 007_social_features.sql
-- ============================================

-- ============================================
-- ARTIST FOLLOWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.artist_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, artist_id)
);

CREATE INDEX idx_artist_follows_user_id ON public.artist_follows(user_id);
CREATE INDEX idx_artist_follows_artist_id_created ON public.artist_follows(artist_id, created_at DESC);

ALTER TABLE public.artist_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist follows are viewable by everyone"
  ON public.artist_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own artist follows"
  ON public.artist_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own artist follows"
  ON public.artist_follows FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- VENUE FOLLOWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.venue_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, venue_id)
);

CREATE INDEX idx_venue_follows_user_id ON public.venue_follows(user_id);
CREATE INDEX idx_venue_follows_venue_id_created ON public.venue_follows(venue_id, created_at DESC);

ALTER TABLE public.venue_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venue follows are viewable by everyone"
  ON public.venue_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own venue follows"
  ON public.venue_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own venue follows"
  ON public.venue_follows FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- USER FOLLOWS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower_id ON public.user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON public.user_follows(following_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User follows are viewable by everyone"
  ON public.user_follows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own follows"
  ON public.user_follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON public.user_follows FOR DELETE
  USING (auth.uid() = follower_id);

-- ============================================
-- REVIEW REACTIONS
-- ============================================
CREATE TYPE public.reaction_type AS ENUM ('like', 'helpful', 'love');

CREATE TABLE IF NOT EXISTS public.review_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reaction_type public.reaction_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, review_id, reaction_type)
);

CREATE INDEX idx_review_reactions_review_id ON public.review_reactions(review_id);
CREATE INDEX idx_review_reactions_user_review ON public.review_reactions(user_id, review_id);

ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review reactions are viewable by everyone"
  ON public.review_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reactions"
  ON public.review_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.review_reactions FOR DELETE
  USING (auth.uid() = user_id);