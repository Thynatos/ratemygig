-- ============================================
-- Search + hot-path indexes, redundant index cleanup
-- Migration: 017_indexes.sql
-- ============================================
-- Sprint 11 (audit findings C1, C10, C11):
--   C1  — EnhancedSearch fires ILIKE '%q%' per debounced keystroke against
--         events/artists/venues; verified Seq Scan on events. pg_trgm is
--         already installed (003), so GIN trigram indexes make these scans
--         Bitmap Index Scans.
--   C10 — four redundant indexes burn write I/O and planner time:
--           idx_events_provider_event_id duplicates the
--             events_provider_provider_event_id_key UNIQUE constraint index
--           idx_artists_name duplicates the artists_name_key UNIQUE index
--           idx_profiles_username duplicates profiles_username_key
--               (both partial on username IS NOT NULL — verified identical)
--           idx_reviews_is_public has ~0 selectivity (nearly every row is
--               public) and is superseded by idx_reviews_event_public
--   C11 — reviews is queried as (event_id, is_public, status) ordered by
--         created_at; a partial covering index serves the dominant
--         published-reviews-per-event path with a pre-sorted scan.
--
-- Idempotent: guarded via DROP INDEX IF EXISTS / IF NOT EXISTS.
-- No edits to applied migrations.

-- ============================================
-- C1: TRIGRAM SEARCH INDEXES
-- ============================================
-- events.name and venues.name lack trigram support; artists.name already has
-- idx_artists_name_trgm (003).

CREATE INDEX IF NOT EXISTS idx_events_name_trgm
  ON public.events USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_venues_name_trgm
  ON public.venues USING gin (name gin_trgm_ops);

-- ============================================
-- C10: DROP REDUNDANT INDEXES
-- ============================================
-- Each drop is guarded on its exact name so reruns are no-ops and unrelated
-- indexes are never touched.

DROP INDEX IF EXISTS public.idx_events_provider_event_id;
DROP INDEX IF EXISTS public.idx_artists_name;
DROP INDEX IF EXISTS public.idx_profiles_username;
DROP INDEX IF EXISTS public.idx_reviews_is_public;

-- ============================================
-- C11: PUBLISHED REVIEWS PER EVENT
-- ============================================
-- Serves the event-detail query shape:
--   WHERE event_id = $1 AND is_public AND status = 'published'
--   ORDER BY created_at DESC
-- The partial predicate matches the RLS policy's anon branch exactly, so the
-- planner can use it for policy-filtered scans as well.

CREATE INDEX IF NOT EXISTS idx_reviews_event_published
  ON public.reviews (event_id, created_at DESC)
  WHERE is_public = true AND status = 'published';
