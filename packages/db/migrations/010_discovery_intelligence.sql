-- ============================================
-- Discovery Intelligence: Preferences, Notifications, RPCs
-- Migration: 010_discovery_intelligence.sql
-- ============================================

-- ============================================
-- USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_city TEXT,
  preferred_lat NUMERIC(10, 7),
  preferred_lng NUMERIC(10, 7),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Preferences are viewable by owner"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('event_reminder', 'new_review', 'artist_event', 'venue_event')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications are viewable by owner"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RECOMMENDED EVENTS RPC
-- ============================================
CREATE OR REPLACE FUNCTION get_recommended_events(p_user_id UUID, p_limit INTEGER DEFAULT 12)
RETURNS TABLE(event_id UUID, reason TEXT, priority INTEGER)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  WITH followed_artists AS (
    SELECT artist_id FROM public.artist_follows WHERE user_id = p_user_id
  ),
  followed_venues AS (
    SELECT venue_id FROM public.venue_follows WHERE user_id = p_user_id
  ),
  user_prefs AS (
    SELECT preferred_city FROM public.user_preferences WHERE user_id = p_user_id
  ),
  event_scores AS (
    SELECT
      e.id AS event_id,
      CASE
        WHEN ea.artist_id IN (SELECT artist_id FROM followed_artists) THEN 100
        WHEN e.venue_id IN (SELECT venue_id FROM followed_venues) THEN 80
        WHEN up.preferred_city IS NOT NULL AND e.city ILIKE up.preferred_city THEN 60
        ELSE 40
      END AS priority,
      CASE
        WHEN ea.artist_id IN (SELECT artist_id FROM followed_artists) THEN 'followed_artist'
        WHEN e.venue_id IN (SELECT venue_id FROM followed_venues) THEN 'followed_venue'
        WHEN up.preferred_city IS NOT NULL AND e.city ILIKE up.preferred_city THEN 'preferred_city'
        ELSE 'trending'
      END AS reason
    FROM public.events e
    LEFT JOIN public.event_artists ea ON ea.event_id = e.id
    LEFT JOIN user_prefs up ON true
    WHERE e.start_at >= NOW()
  )
  SELECT DISTINCT ON (event_id) event_id, reason, priority
  FROM event_scores
  ORDER BY event_id, priority DESC;
END;
$$;

-- ============================================
-- NEARBY VENUES RPC
-- ============================================
CREATE OR REPLACE FUNCTION get_nearby_venues(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km INTEGER DEFAULT 50,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(id UUID, name TEXT, city TEXT, country TEXT, lat NUMERIC, lng NUMERIC, distance_km NUMERIC)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.name,
    v.city,
    v.country,
    v.lat,
    v.lng,
    (
      6371 * acos(
        least(1.0, cos(radians(p_lat)) * cos(radians(v.lat)) *
        cos(radians(v.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(v.lat)))
      )
    )::NUMERIC(10,2) AS distance_km
  FROM public.venues v
  WHERE v.lat IS NOT NULL AND v.lng IS NOT NULL
    AND (
      6371 * acos(
        least(1.0, cos(radians(p_lat)) * cos(radians(v.lat)) *
        cos(radians(v.lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(v.lat)))
      )
    ) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- TRENDING EVENTS RPC
-- ============================================
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
  LEFT JOIN public.reviews rev ON rev.event_id = e.id AND rev.is_public = true
  WHERE e.start_at >= NOW()
  GROUP BY e.id
  ORDER BY trending_score DESC, e.start_at ASC
  LIMIT p_limit;
END;
$$;