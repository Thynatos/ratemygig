-- ============================================
-- Gig Wrapped: user year-in-review stats RPC
-- Migration: 015_user_year_stats.sql
-- ============================================
-- Powers the /wrapped page: one call returns a single row of personal
-- yearly stats (gigs, reviews, photos, cities, top artists/venues).
--
-- Why SECURITY DEFINER: attendance RLS is owner-only ("Users can view own
-- attendance", see 002_rls_policies.sql) and review_photos access is gated
-- through the parent review's is_public flag — a DEFINER function avoids
-- every RLS edge case for the caller's OWN data.
--
-- Security note: because SECURITY DEFINER bypasses RLS, this function
-- deliberately scopes every query to the CALLER (auth.uid()), NOT to
-- p_user_id. p_user_id is kept only for signature compatibility and is
-- ignored — passing another user's id still returns the caller's own stats.
--
-- Year scoping:
--   * gigs/photos/cities/dates: year of the EVENT's start_at (attendance)
--   * reviews_written / avg_rating / photos: year of the REVIEW's created_at
--   * windows are UTC ([Jan 1 00:00 UTC, next year Jan 1 00:00 UTC)); a
--     local-time midnight show near Dec 31 may therefore count for the
--     neighbouring UTC day.
--
-- Serialization notes (client-facing):
--   * COUNT(*) is bigint and jsonb rejects bigint → cast COUNT(*)::INT.
--   * AVG(rating) is numeric; the TABLE column is DOUBLE PRECISION so
--     PostgREST serializes a JSON number, not a numeric string.
--   * The function always returns exactly one row (all scalar subqueries),
--     so the client can distinguish "no data this year" from an RPC error.

CREATE OR REPLACE FUNCTION public.get_user_year_stats(p_user_id UUID, p_year INT)
RETURNS TABLE(
  gigs_attended    INT,
  reviews_written  INT,
  avg_rating_given DOUBLE PRECISION,
  photos_uploaded  INT,
  distinct_cities  INT,
  first_gig_date   TIMESTAMPTZ,
  last_gig_date    TIMESTAMPTZ,
  top_artists      JSONB,
  top_venues       JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::INT
       FROM public.attendance a
       JOIN public.events e ON e.id = a.event_id
      WHERE a.user_id = auth.uid()
        AND a.status = 'attended'
        AND e.start_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
        AND e.start_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')),

    (SELECT COUNT(*)::INT
       FROM public.reviews r
      WHERE r.user_id = auth.uid()
        AND r.status = 'published'
        AND r.created_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
        AND r.created_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')),

    COALESCE((SELECT ROUND(AVG(r.rating), 1)::FLOAT8
       FROM public.reviews r
      WHERE r.user_id = auth.uid()
        AND r.status = 'published'
        AND r.created_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
        AND r.created_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')), 0),

    (SELECT COUNT(*)::INT
       FROM public.review_photos rp
       JOIN public.reviews r ON r.id = rp.review_id
      WHERE r.user_id = auth.uid()
        AND r.status = 'published'
        AND r.created_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
        AND r.created_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')),

    (SELECT COUNT(DISTINCT e.city)::INT
       FROM public.attendance a
       JOIN public.events e ON e.id = a.event_id
      WHERE a.user_id = auth.uid()
        AND a.status = 'attended'
        AND e.start_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
        AND e.start_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')),

    (SELECT MIN(e.start_at)
       FROM public.attendance a
       JOIN public.events e ON e.id = a.event_id
      WHERE a.user_id = auth.uid()
        AND a.status = 'attended'
        AND e.start_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
        AND e.start_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')),

    (SELECT MAX(e.start_at)
       FROM public.attendance a
       JOIN public.events e ON e.id = a.event_id
      WHERE a.user_id = auth.uid()
        AND a.status = 'attended'
        AND e.start_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
        AND e.start_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')),

    (SELECT COALESCE(jsonb_agg(js), '[]'::jsonb)
       FROM (
         SELECT jsonb_build_object('name', ar.name, 'count', COUNT(*)::INT) AS js
           FROM public.attendance a
           JOIN public.events e ON e.id = a.event_id
           JOIN public.event_artists ea ON ea.event_id = e.id
           JOIN public.artists ar ON ar.id = ea.artist_id
          WHERE a.user_id = auth.uid()
            AND a.status = 'attended'
            AND e.start_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
            AND e.start_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')
          GROUP BY ar.id, ar.name
          ORDER BY COUNT(*) DESC, ar.name
          LIMIT 5
       ) artist_counts),

    (SELECT COALESCE(jsonb_agg(js), '[]'::jsonb)
       FROM (
         SELECT jsonb_build_object('name', v.name, 'count', COUNT(*)::INT) AS js
           FROM public.attendance a
           JOIN public.events e ON e.id = a.event_id
           JOIN public.venues v ON v.id = e.venue_id
          WHERE a.user_id = auth.uid()
            AND a.status = 'attended'
            AND e.venue_id IS NOT NULL
            AND e.start_at >= make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC')
            AND e.start_at <  make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC')
          GROUP BY v.id, v.name
          ORDER BY COUNT(*) DESC, v.name
          LIMIT 5
       ) venue_counts);
$$;

-- ============================================
-- MANUAL VERIFICATION (paste into Supabase SQL editor)
-- ============================================
-- Replace <USER_UUID>, <EVENT_Y1_UUID>, <EVENT_Y2_UUID>,
-- <EVENT_PREV_YEAR_UUID>, <ARTIST_UUID>, <VENUE_UUID> with real rows.
-- auth.uid() is simulated via set_config('request.jwt.claim.sub', ...).
--
-- Setup (current year = Y, e.g. 2026):
--
--   INSERT INTO public.attendance (user_id, event_id, status)
--   VALUES ('<USER_UUID>', '<EVENT_Y1_UUID>', 'attended'),
--          ('<USER_UUID>', '<EVENT_Y2_UUID>', 'attended'),
--          ('<USER_UUID>', '<EVENT_PREV_YEAR_UUID>', 'attended');
--
--   INSERT INTO public.reviews (user_id, event_id, rating, title, body, is_public, status)
--   VALUES ('<USER_UUID>', '<EVENT_Y1_UUID>', 5, 'Great', 'Body', true, 'published'),
--          ('<USER_UUID>', '<EVENT_Y2_UUID>', 4, 'Draft', 'Body', true, 'draft');
--
--   INSERT INTO public.review_photos (review_id, storage_path)
--   SELECT id, 'test/path.jpg' FROM public.reviews WHERE user_id = '<USER_UUID>' AND status = 'published';
--
-- 1) Call as the user for year Y:
--
--   SELECT set_config('request.jwt.claim.sub', '<USER_UUID>', true);
--   SELECT * FROM public.get_user_year_stats('<USER_UUID>', <Y>);
--
--    Expect: gigs_attended = 2, reviews_written = 1, avg_rating_given = 5,
--    photos_uploaded = 1, top_artists/top_venues include the artist/venue
--    linked to the two attended events (if linked via event_artists/venue_id).
--
-- 2) Year Y-1 returns only the previous-year gig:
--
--   SELECT * FROM public.get_user_year_stats('<USER_UUID>', <Y> - 1);
--
-- 3) Anti-enumeration check: passing a DIFFERENT user must return the
--    CALLER's stats — result identical to step 1 (replace <OTHER_UUID>):
--
--   SELECT * FROM public.get_user_year_stats('<OTHER_UUID>', <Y>);
--
-- 4) Unauthenticated call returns a zero row (auth.uid() is NULL):
--
--   SELECT set_config('request.jwt.claim.sub', '', true);
--   SELECT * FROM public.get_user_year_stats('<USER_UUID>', <Y>);
--
-- 5) Cleanup:
--
--   DELETE FROM public.review_photos WHERE storage_path = 'test/path.jpg';
--   DELETE FROM public.reviews WHERE user_id = '<USER_UUID>' AND title IN ('Great', 'Draft');
--   DELETE FROM public.attendance WHERE user_id = '<USER_UUID>'
--     AND event_id IN ('<EVENT_Y1_UUID>', '<EVENT_Y2_UUID>', '<EVENT_PREV_YEAR_UUID>');
