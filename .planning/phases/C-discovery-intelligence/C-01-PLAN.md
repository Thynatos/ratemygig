# Plan C-01: Discovery Data Model & Core API

**Wave:** 1 (Foundation — must land before C-02/C-03)
**Goal:** Create the database migration for user preferences, notifications, and discovery RPC functions, plus all React Query hooks.

---

## Context

- The DiscoverPage currently only supports city filtering and text search against event names.
- Three follow tables exist: `artist_follows`, `venue_follows`, `user_follows` — these power the recommendation engine.
- Venues have `lat` and `lng` columns but no geolocation queries exist.
- No user preferences table exists — city selection is localStorage-only.
- `useInfiniteScroll` exists but isn't wired up on DiscoverPage.
- RPC pattern established in migrations 004 and 009.

## Files to Create/Modify

### 1. `packages/db/migrations/010_discovery_intelligence.sql`

```sql
-- USER PREFERENCES
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

-- NOTIFICATIONS
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

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- RECOMMENDED EVENTS RPC
-- Returns events ranked by: followed artists > followed venues > preferred city > trending
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
    SELECT preferred_city, preferred_lat, preferred_lng
    FROM public.user_preferences WHERE user_id = p_user_id
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
  ORDER BY event_id, priority DESC, reason;
END;
$$;

-- NEARBY VENUES RPC
-- Uses the haversine formula for distance calculation
CREATE OR REPLACE FUNCTION get_nearby_venues(p_lat NUMERIC, p_lng NUMERIC, p_radius_km INTEGER DEFAULT 50, p_limit INTEGER DEFAULT 20)
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
    ) AS distance_km
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

-- TRENDING EVENTS RPC
-- Returns events with the most attendance and reviews in the last 30 days
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
  WHERE e.start_at >= NOW() - INTERVAL '30 days'
    AND e.start_at >= NOW()
  GROUP BY e.id
  ORDER BY trending_score DESC, e.start_at ASC
  LIMIT p_limit;
END;
$$;
```

### 2. `packages/core/src/types/index.ts` — Add discovery types

```typescript
export interface UserPreferences {
  id: string
  user_id: string
  preferred_city: string | null
  preferred_lat: number | null
  preferred_lng: number | null
  created_at: string
  updated_at: string
}

export type NotificationType = 'event_reminder' | 'new_review' | 'artist_event' | 'venue_event'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export type RecommendationReason = 'followed_artist' | 'followed_venue' | 'preferred_city' | 'trending'
```

### 3. `apps/web/src/features/discovery/api/discovery.ts` — New file

Query key factory + hooks:
- `discoveryKeys = { recommended: (userId) => [...], nearbyVenues: (lat, lng, radius) => [...], trending: (limit) => [...] }`
- `useRecommendedEvents(limit?)` — calls `supabase.rpc('get_recommended_events', ...)`, then fetches full event data by ID, using existing `resolveEvents` for enrichment
- `useNearbyVenues(lat, lng, radiusKm?, limit?)` — calls `supabase.rpc('get_nearby_venues', ...)`, enabled only when lat/lng are provided
- `useTrendingEvents(limit?)` — calls `supabase.rpc('get_trending_events', ...)`, then fetches event data

### 4. `apps/web/src/features/discovery/api/preferences.ts` — New file

- `preferenceKeys = { all: ['preferences'], user: (userId) => [...] }`
- `useUserPreferences()` — fetches current user's preferences, enabled only when authenticated
- `useUpdatePreferences()` — optimistic mutation to upsert preferences row
- `useSetPreferredLocation(city, lat, lng)` — convenience mutation

### 5. `apps/web/src/features/notifications/api/notifications.ts` — New file

- `notificationKeys = { all: ['notifications'], user: (userId) => [...], unreadCount: (userId) => [...] }`
- `useNotifications()` — fetches current user's notifications ordered by created_at desc
- `useMarkNotificationRead(id)` — mutation to set is_read = true
- `useMarkAllNotificationsRead()` — mutation to set all user's notifications is_read = true
- `useUnreadNotificationCount()` — count of unread notifications

---

## Task Breakdown

| # | Task | Files | Dependencies |
|---|------|-------|-------------|
| 1 | Write migration `010_discovery_intelligence.sql` | `packages/db/migrations/010_discovery_intelligence.sql` | None |
| 2 | Add discovery/notification types to `@core/types` | `packages/core/src/types/index.ts` | None |
| 3 | Create discovery API hooks | `apps/web/src/features/discovery/api/discovery.ts` | Tasks 1, 2 |
| 4 | Create preferences API hooks | `apps/web/src/features/discovery/api/preferences.ts` | Tasks 1, 2 |
| 5 | Create notifications API hooks | `apps/web/src/features/notifications/api/notifications.ts` | Tasks 1, 2 |
| 6 | Run `npm run lint`, `npm run build`, `npm run test` | — | Tasks 1-5 |

## Verification

- Migration SQL runs without errors against Supabase
- All TypeScript types compile without errors
- Query key factories follow established pattern
- All hooks use `useAuth` for auth checks where appropriate
- RPC functions return correct data shapes
- Build passes, 112+ tests pass, 0 lint errors