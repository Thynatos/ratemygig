-- ============================================
-- Schema Fixes: profiles FKs, broken RPCs, RLS status gates
-- Migration: 016_schema_fixes.sql
-- ============================================
-- Fixes the Tier 0 findings from docs/AUDIT_REPORT.md (2026-08-21):
--   A1  — no FK to public.profiles: every profile:profiles(...) PostgREST
--         embed returns 400 PGRST200 across 6 features
--   A2  — get_recommended_events throws 42702 (ambiguous event_id) and
--   C2  — ignores p_limit entirely
--   A5  — get_artist_setlist_stats throws 42703 (ss.song_id missing)
--   B1  — reviews SELECT policy and all aggregation RPCs lack a
--         status = 'published' gate (draft protection is client-side only)
--   A8  — storage policy never matches thumbnail_path, so non-owners
--         cannot sign thumbnails of public reviews
--   B7  — handle_new_user() is SECURITY DEFINER with unpinned search_path
--
-- Idempotent: constraints are guarded via pg_constraint lookups, policies
-- via DROP POLICY IF EXISTS, functions via CREATE OR REPLACE.

-- ============================================
-- GUARD: refuse to run if any row references a user without a profile
-- ============================================
-- Verified 0 orphans on 2026-08-21. profiles.id IS auth.users.id and
-- handle_new_user() inserts a profile for every new user, so orphans can
-- only exist if a profile row was deleted manually. Fail loudly rather
-- than let ADD CONSTRAINT produce a harder-to-read error.

DO $$
DECLARE
  orphan_count BIGINT;
BEGIN
  SELECT
      (SELECT COUNT(*) FROM public.reviews r
        WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = r.user_id))
    + (SELECT COUNT(*) FROM public.comments c
        WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = c.user_id))
    + (SELECT COUNT(*) FROM public.lists l
        WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = l.user_id))
    + (SELECT COUNT(*) FROM public.setlists s
        WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.user_id))
    + (SELECT COUNT(*) FROM public.user_follows f
        WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = f.follower_id)
           OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = f.following_id))
  INTO orphan_count;

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Cannot add profiles foreign keys: % row(s) reference a user without a profile. Backfill public.profiles first.', orphan_count;
  END IF;
END $$;

-- ============================================
-- FOREIGN KEYS TO public.profiles (fixes A1)
-- ============================================
-- The existing auth.users FKs stay in place; profiles.id IS auth.users.id
-- so both constraints hold simultaneously. ON DELETE CASCADE matches the
-- auth.users FKs: deleting an auth user cascades to profiles, which now
-- cascades onward — same end state as today.
--
-- user_follows gains TWO FKs to profiles, so its embeds stay ambiguous and
-- the client must keep disambiguating hints. The old hint names
-- (user_follows_follower_id_fkey / ..._following_id_fkey) belong to the
-- auth.users constraints and cannot be reused — the client hints in
-- features/profile/api/follows.ts are updated in the same sprint to the
-- new names below.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'reviews_user_profile_fkey'
                    AND conrelid = 'public.reviews'::regclass) THEN
    ALTER TABLE public.reviews
      ADD CONSTRAINT reviews_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'comments_user_profile_fkey'
                    AND conrelid = 'public.comments'::regclass) THEN
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'lists_user_profile_fkey'
                    AND conrelid = 'public.lists'::regclass) THEN
    ALTER TABLE public.lists
      ADD CONSTRAINT lists_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'setlists_user_profile_fkey'
                    AND conrelid = 'public.setlists'::regclass) THEN
    ALTER TABLE public.setlists
      ADD CONSTRAINT setlists_user_profile_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'user_follows_follower_profile_fkey'
                    AND conrelid = 'public.user_follows'::regclass) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_follower_profile_fkey
      FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'user_follows_following_profile_fkey'
                    AND conrelid = 'public.user_follows'::regclass) THEN
    ALTER TABLE public.user_follows
      ADD CONSTRAINT user_follows_following_profile_fkey
      FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- FIX get_recommended_events (fixes A2 + C2)
-- ============================================
-- 010's version selected DISTINCT ON (event_id) where event_id collided
-- with the RETURNS TABLE OUT parameter (42702), and never used p_limit.
-- Inner columns are renamed scored_* so no reference can collide with an
-- OUT parameter, and the final SELECT orders by priority and applies the
-- limit. Ties break on soonest start_at.

CREATE OR REPLACE FUNCTION get_recommended_events(p_user_id UUID, p_limit INTEGER DEFAULT 12)
RETURNS TABLE(event_id UUID, reason TEXT, priority INTEGER)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH followed_artists AS (
    SELECT af.artist_id FROM public.artist_follows af WHERE af.user_id = p_user_id
  ),
  followed_venues AS (
    SELECT vf.venue_id FROM public.venue_follows vf WHERE vf.user_id = p_user_id
  ),
  user_prefs AS (
    SELECT up.preferred_city FROM public.user_preferences up WHERE up.user_id = p_user_id
  ),
  event_scores AS (
    SELECT
      e.id AS scored_event_id,
      e.start_at AS scored_start_at,
      CASE
        WHEN ea.artist_id IN (SELECT fa.artist_id FROM followed_artists fa) THEN 100
        WHEN e.venue_id IN (SELECT fv.venue_id FROM followed_venues fv) THEN 80
        WHEN up.preferred_city IS NOT NULL AND e.city ILIKE up.preferred_city THEN 60
        ELSE 40
      END AS scored_priority,
      CASE
        WHEN ea.artist_id IN (SELECT fa.artist_id FROM followed_artists fa) THEN 'followed_artist'
        WHEN e.venue_id IN (SELECT fv.venue_id FROM followed_venues fv) THEN 'followed_venue'
        WHEN up.preferred_city IS NOT NULL AND e.city ILIKE up.preferred_city THEN 'preferred_city'
        ELSE 'trending'
      END AS scored_reason
    FROM public.events e
    LEFT JOIN public.event_artists ea ON ea.event_id = e.id
    LEFT JOIN user_prefs up ON true
    WHERE e.start_at >= NOW()
  ),
  best_per_event AS (
    SELECT DISTINCT ON (es.scored_event_id)
      es.scored_event_id,
      es.scored_reason,
      es.scored_priority,
      es.scored_start_at
    FROM event_scores es
    ORDER BY es.scored_event_id, es.scored_priority DESC
  )
  SELECT b.scored_event_id, b.scored_reason, b.scored_priority
  FROM best_per_event b
  ORDER BY b.scored_priority DESC, b.scored_start_at ASC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- FIX get_artist_setlist_stats (fixes A5)
-- ============================================
-- 009's version selected ss.song_id from a subquery that only projected
-- (setlist_id, song_count) — 42703 on every call. total_unique_songs is
-- now a separate scalar subquery. The HAVING clause returns zero rows
-- (instead of one all-NULL row) for artists with no setlist songs, which
-- is what the client's "if (!data || data.length === 0) return null"
-- branch and the non-nullable Zod schema expect.

CREATE OR REPLACE FUNCTION get_artist_setlist_stats(p_artist_id UUID)
RETURNS TABLE(setlist_count BIGINT, avg_song_count NUMERIC, total_unique_songs BIGINT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH artist_setlists AS (
    SELECT DISTINCT sl.id
    FROM public.setlists sl
    JOIN public.event_artists ea ON ea.event_id = sl.event_id
    WHERE ea.artist_id = p_artist_id
  ),
  per_setlist_songs AS (
    SELECT ss.setlist_id, COUNT(*) AS song_count
    FROM public.setlist_songs ss
    JOIN artist_setlists asl ON asl.id = ss.setlist_id
    GROUP BY ss.setlist_id
  )
  SELECT
    COUNT(*)::BIGINT AS setlist_count,
    ROUND(AVG(pss.song_count), 1) AS avg_song_count,
    (SELECT COUNT(DISTINCT ss2.song_id)
       FROM public.setlist_songs ss2
       JOIN artist_setlists asl2 ON asl2.id = ss2.setlist_id)::BIGINT AS total_unique_songs
  FROM per_setlist_songs pss
  HAVING COUNT(*) > 0;
END;
$$;

-- ============================================
-- STATUS GATES IN AGGREGATION RPCS (fixes B1 downstream)
-- ============================================
-- Redefinitions of the five 004 functions and 010's get_trending_events
-- with AND r.status = 'published' on every reviews join, so drafts never
-- count toward public venue/artist/event averages, tags, or trending.

CREATE OR REPLACE FUNCTION get_venue_rating_summary(
  p_venue_id UUID DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS TABLE (
  venue_id UUID,
  venue_name TEXT,
  city TEXT,
  avg_rating NUMERIC,
  count_reviews BIGINT,
  rating_1 BIGINT,
  rating_2 BIGINT,
  rating_3 BIGINT,
  rating_4 BIGINT,
  rating_5 BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS venue_id,
    v.name AS venue_name,
    v.city,
    ROUND(AVG(r.rating)::NUMERIC, 2) AS avg_rating,
    COUNT(r.id) AS count_reviews,
    COUNT(r.id) FILTER (WHERE r.rating = 1) AS rating_1,
    COUNT(r.id) FILTER (WHERE r.rating = 2) AS rating_2,
    COUNT(r.id) FILTER (WHERE r.rating = 3) AS rating_3,
    COUNT(r.id) FILTER (WHERE r.rating = 4) AS rating_4,
    COUNT(r.id) FILTER (WHERE r.rating = 5) AS rating_5
  FROM public.venues v
  LEFT JOIN public.events e ON e.venue_id = v.id
  LEFT JOIN public.reviews r ON r.event_id = e.id AND r.is_public = true AND r.status = 'published'
  WHERE
    (p_venue_id IS NULL OR v.id = p_venue_id)
    AND (p_city IS NULL OR v.city ILIKE p_city)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM e.start_at) = p_year)
  GROUP BY v.id, v.name, v.city
  HAVING COUNT(r.id) > 0
  ORDER BY avg_rating DESC NULLS LAST, count_reviews DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_artist_rating_summary(
  p_artist_id UUID DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL,
  p_venue_id UUID DEFAULT NULL
)
RETURNS TABLE (
  artist_id UUID,
  artist_name TEXT,
  avg_rating NUMERIC,
  count_reviews BIGINT,
  rating_1 BIGINT,
  rating_2 BIGINT,
  rating_3 BIGINT,
  rating_4 BIGINT,
  rating_5 BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id AS artist_id,
    a.name AS artist_name,
    ROUND(AVG(r.rating)::NUMERIC, 2) AS avg_rating,
    COUNT(r.id) AS count_reviews,
    COUNT(r.id) FILTER (WHERE r.rating = 1) AS rating_1,
    COUNT(r.id) FILTER (WHERE r.rating = 2) AS rating_2,
    COUNT(r.id) FILTER (WHERE r.rating = 3) AS rating_3,
    COUNT(r.id) FILTER (WHERE r.rating = 4) AS rating_4,
    COUNT(r.id) FILTER (WHERE r.rating = 5) AS rating_5
  FROM public.artists a
  LEFT JOIN public.event_artists ea ON ea.artist_id = a.id
  LEFT JOIN public.events e ON e.id = ea.event_id
  LEFT JOIN public.reviews r ON r.event_id = e.id AND r.is_public = true AND r.status = 'published'
  WHERE
    (p_artist_id IS NULL OR a.id = p_artist_id)
    AND (p_city IS NULL OR e.city ILIKE p_city)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM e.start_at) = p_year)
    AND (p_venue_id IS NULL OR e.venue_id = p_venue_id)
  GROUP BY a.id, a.name
  HAVING COUNT(r.id) > 0
  ORDER BY avg_rating DESC NULLS LAST, count_reviews DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_event_rating_summary(p_event_id UUID)
RETURNS TABLE (
  event_id UUID,
  avg_rating NUMERIC,
  count_reviews BIGINT,
  rating_1 BIGINT,
  rating_2 BIGINT,
  rating_3 BIGINT,
  rating_4 BIGINT,
  rating_5 BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    ROUND(AVG(r.rating)::NUMERIC, 2) AS avg_rating,
    COUNT(r.id) AS count_reviews,
    COUNT(r.id) FILTER (WHERE r.rating = 1) AS rating_1,
    COUNT(r.id) FILTER (WHERE r.rating = 2) AS rating_2,
    COUNT(r.id) FILTER (WHERE r.rating = 3) AS rating_3,
    COUNT(r.id) FILTER (WHERE r.rating = 4) AS rating_4,
    COUNT(r.id) FILTER (WHERE r.rating = 5) AS rating_5
  FROM public.events e
  LEFT JOIN public.reviews r ON r.event_id = e.id AND r.is_public = true AND r.status = 'published'
  WHERE e.id = p_event_id
  GROUP BY e.id;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_venue_top_tags(
  p_venue_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  tag_name TEXT,
  tag_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.name AS tag_name,
    COUNT(rt.tag_id) AS tag_count
  FROM public.tags t
  JOIN public.review_tags rt ON rt.tag_id = t.id
  JOIN public.reviews r ON r.id = rt.review_id AND r.is_public = true AND r.status = 'published'
  JOIN public.events e ON e.id = r.event_id
  WHERE e.venue_id = p_venue_id
  GROUP BY t.id, t.name
  ORDER BY tag_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_artist_top_tags(
  p_artist_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  tag_name TEXT,
  tag_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.name AS tag_name,
    COUNT(rt.tag_id) AS tag_count
  FROM public.tags t
  JOIN public.review_tags rt ON rt.tag_id = t.id
  JOIN public.reviews r ON r.id = rt.review_id AND r.is_public = true AND r.status = 'published'
  JOIN public.events e ON e.id = r.event_id
  JOIN public.event_artists ea ON ea.event_id = e.id
  WHERE ea.artist_id = p_artist_id
  GROUP BY t.id, t.name
  ORDER BY tag_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_trending_events(p_limit INTEGER DEFAULT 10)
RETURNS TABLE(event_id UUID, attendance_count BIGINT, review_count BIGINT, trending_score NUMERIC)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS event_id,
    COUNT(DISTINCT att.id)::BIGINT AS attendance_count,
    COUNT(DISTINCT rev.id)::BIGINT AS review_count,
    (COUNT(DISTINCT att.id)::NUMERIC * 1.0 + COUNT(DISTINCT rev.id)::NUMERIC * 2.0) AS trending_score
  FROM public.events e
  LEFT JOIN public.attendance att ON att.event_id = e.id
  LEFT JOIN public.reviews rev ON rev.event_id = e.id AND rev.is_public = true AND rev.status = 'published'
  WHERE e.start_at >= NOW()
  GROUP BY e.id
  ORDER BY trending_score DESC, e.start_at ASC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- REVIEWS SELECT POLICY STATUS GATE (fixes B1)
-- ============================================
-- The anon branch now requires status = 'published'. The owner branch
-- stays unqualified so useDrafts() (status = 'draft' for the current
-- user) keeps working.

DROP POLICY IF EXISTS "Public reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Public reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING ((is_public = true AND status = 'published') OR auth.uid() = user_id);

-- ============================================
-- STORAGE POLICY: THUMBNAILS + STATUS GATE (fixes A8 + B1)
-- ============================================
-- Thumbnails are written to thumbnail_path ({uid}/{reviewId}/thumbs/...),
-- which the old policy never matched — non-owners could not sign them.

DROP POLICY IF EXISTS "Public can read photos of public reviews" ON storage.objects;
CREATE POLICY "Public can read photos of public reviews"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'review-photos'
  AND EXISTS (
    SELECT 1 FROM public.review_photos rp
    JOIN public.reviews r ON r.id = rp.review_id
    WHERE (rp.storage_path = objects.name OR rp.thumbnail_path = objects.name)
    AND r.is_public = true
    AND r.status = 'published'
  )
);

-- ============================================
-- PIN handle_new_user SEARCH_PATH (fixes B7)
-- ============================================

ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

-- ============================================
-- RELOAD POSTGREST SCHEMA CACHE
-- ============================================
-- Supabase reloads on DDL automatically; this makes it deterministic so
-- the new FKs are embeddable immediately after the migration runs.

NOTIFY pgrst, 'reload schema';
