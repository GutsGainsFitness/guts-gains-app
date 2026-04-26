
-- Add cover image column to blog posts
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Create public bucket for blog cover images (5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-covers',
  'blog-covers',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp'];

-- RLS policies for blog-covers bucket
DROP POLICY IF EXISTS "Anyone can view blog covers" ON storage.objects;
CREATE POLICY "Anyone can view blog covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-covers');

DROP POLICY IF EXISTS "Admins can upload blog covers" ON storage.objects;
CREATE POLICY "Admins can upload blog covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-covers' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update blog covers" ON storage.objects;
CREATE POLICY "Admins can update blog covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-covers' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete blog covers" ON storage.objects;
CREATE POLICY "Admins can delete blog covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-covers' AND public.has_role(auth.uid(), 'admin'));
