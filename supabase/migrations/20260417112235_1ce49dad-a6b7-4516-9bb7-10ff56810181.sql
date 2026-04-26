-- Public bucket for exercise illustrations
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-illustrations', 'exercise-illustrations', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Exercise illustrations publicly viewable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'exercise-illustrations');

-- Only admins can upload/update/delete
CREATE POLICY "Admins can upload exercise illustrations"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'exercise-illustrations' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update exercise illustrations"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'exercise-illustrations' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete exercise illustrations"
ON storage.objects
FOR DELETE
USING (bucket_id = 'exercise-illustrations' AND public.has_role(auth.uid(), 'admin'));