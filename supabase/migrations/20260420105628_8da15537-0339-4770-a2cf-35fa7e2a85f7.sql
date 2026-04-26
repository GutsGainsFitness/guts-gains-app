DROP POLICY IF EXISTS "Anyone can submit intake" ON public.intake_requests;

CREATE POLICY "Anyone can submit intake"
ON public.intake_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
