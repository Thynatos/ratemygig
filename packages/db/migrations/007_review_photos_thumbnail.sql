-- ============================================-- Migration 007: Add thumbnail_path to review_photos-- ============================================

ALTER TABLE public.review_photos
  ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Add index for thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_review_photos_thumbnail
  ON public.review_photos (thumbnail_path)
  WHERE thumbnail_path IS NOT NULL;
