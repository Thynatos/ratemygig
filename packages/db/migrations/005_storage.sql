-- ============================================
-- Storage Bucket Configuration
-- Migration: 005_storage.sql
-- ============================================

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-photos',
  'review-photos',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage Policies
-- ============================================

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own review photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'review-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to read their own photos
CREATE POLICY "Users can read their own review photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'review-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own review photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'review-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for photos of public reviews
CREATE POLICY "Public can read photos of public reviews"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'review-photos'
  AND EXISTS (
    SELECT 1 FROM public.review_photos rp
    JOIN public.reviews r ON r.id = rp.review_id
    WHERE rp.storage_path = name
    AND r.is_public = true
  )
);
