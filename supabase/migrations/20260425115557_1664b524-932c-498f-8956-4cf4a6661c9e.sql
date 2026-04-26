-- Create public bucket for marketing media (testimonials, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-media', 'marketing-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access
CREATE POLICY "Public can read marketing media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'marketing-media');

-- Only admins can upload/update/delete
CREATE POLICY "Admins can insert marketing media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update marketing media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete marketing media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'marketing-media' AND public.has_role(auth.uid(), 'admin'));