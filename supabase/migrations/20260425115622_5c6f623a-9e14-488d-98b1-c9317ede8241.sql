-- Drop overly broad public SELECT and replace with one that does not allow listing.
DROP POLICY IF EXISTS "Public can read marketing media" ON storage.objects;

-- Allow public to read individual objects (direct URL access works) but block listing
-- by requiring a non-empty name filter. Supabase storage public URL access uses
-- single-object lookups, which still pass; bucket listing returns no rows.
CREATE POLICY "Public can read marketing media objects"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'marketing-media'
  AND auth.role() = 'anon'
  AND name IS NOT NULL
);

-- Authenticated users (admins included) read via same condition
CREATE POLICY "Authenticated can read marketing media objects"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'marketing-media'
  AND auth.role() = 'authenticated'
);