-- ============================================
-- OG image render cache bucket
-- Migration: 018_og_image_cache.sql
-- ============================================
-- Sprint 11 (Task 4): cache rendered share-card PNGs in a public Storage
-- bucket so repeat og-image requests skip the satori+resvg render (~1.2s
-- CPU). CF-Cache-Status: DYNAMIC proved s-maxage is not honoured in front
-- of Supabase Functions, so this bucket is the effective cache layer.
--
-- Key format: cards/{reviewId}-{updated_at}.png — an edited review gets a
-- new updated_at and therefore a fresh key; stale keys become garbage that
-- can be reaped by a future cleanup job.
--
-- Idempotent: guarded by ON CONFLICT.

INSERT INTO storage.buckets (id, name, public)
VALUES ('og-cache', 'og-cache', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read comes from bucket visibility (no object policy needed).
-- Writes go through the service role key inside the og-image function,
-- which bypasses RLS; no write policy is granted to anon/authenticated.
