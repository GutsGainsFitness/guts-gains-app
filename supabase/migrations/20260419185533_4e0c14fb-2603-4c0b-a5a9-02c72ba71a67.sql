-- Fix #1: recreate view with security_invoker so it respects caller's RLS
DROP VIEW IF EXISTS public.marketing_consent_current;
CREATE VIEW public.marketing_consent_current
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (lower(email))
  lower(email) AS email,
  user_id,
  granted,
  granted_at,
  withdrawn_at,
  policy_version,
  source
FROM public.marketing_consents
ORDER BY lower(email), granted_at DESC;

-- Fix #2: tighten the insert policy. The previous policy used USING/CHECK
-- on user_id but allowed `user_id IS NULL` for anyone — that's intentional
-- for anonymous cookie-banner traffic, but we add an email length+format
-- guard at the database level so the table cannot be flooded with junk.
DROP POLICY IF EXISTS "Anyone can record their consent" ON public.marketing_consents;

CREATE POLICY "Anyone can record their consent"
ON public.marketing_consents
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- email must look valid and have reasonable length
  email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND length(email) BETWEEN 3 AND 320
  AND length(consent_text) BETWEEN 10 AND 5000
  -- if user_id is provided, it MUST be the caller (prevents impersonation)
  AND (user_id IS NULL OR user_id = auth.uid())
);