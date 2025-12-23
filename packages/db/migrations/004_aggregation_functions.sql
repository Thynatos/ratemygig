-- ============================================
-- Aggregation Functions (RPC)
-- Migration: 004_aggregation_functions.sql
-- ============================================

-- ============================================
-- GET VENUE RATING SUMMARY
-- ============================================

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
  LEFT JOIN public.reviews r ON r.event_id = e.id AND r.is_public = true
  WHERE 
    (p_venue_id IS NULL OR v.id = p_venue_id)
    AND (p_city IS NULL OR v.city ILIKE p_city)
    AND (p_year IS NULL OR EXTRACT(YEAR FROM e.start_at) = p_year)
  GROUP BY v.id, v.name, v.city
  HAVING COUNT(r.id) > 0
  ORDER BY avg_rating DESC NULLS LAST, count_reviews DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GET ARTIST RATING SUMMARY
-- ============================================

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
  LEFT JOIN public.reviews r ON r.event_id = e.id AND r.is_public = true
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

-- ============================================
-- GET EVENT RATING SUMMARY
-- ============================================

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
  LEFT JOIN public.reviews r ON r.event_id = e.id AND r.is_public = true
  WHERE e.id = p_event_id
  GROUP BY e.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GET TOP TAGS FOR VENUE
-- ============================================

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
  JOIN public.reviews r ON r.id = rt.review_id AND r.is_public = true
  JOIN public.events e ON e.id = r.event_id
  WHERE e.venue_id = p_venue_id
  GROUP BY t.id, t.name
  ORDER BY tag_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GET TOP TAGS FOR ARTIST
-- ============================================

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
  JOIN public.reviews r ON r.id = rt.review_id AND r.is_public = true
  JOIN public.events e ON e.id = r.event_id
  JOIN public.event_artists ea ON ea.event_id = e.id
  WHERE ea.artist_id = p_artist_id
  GROUP BY t.id, t.name
  ORDER BY tag_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
