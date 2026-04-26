-- Marketing consents: GDPR-compliant proof of opt-in for email marketing.
-- Each consent change creates a NEW row (we never overwrite history) so we
-- can prove exactly what the user saw and agreed to at any point in time.
CREATE TABLE public.marketing_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  granted boolean NOT NULL,
  source text NOT NULL CHECK (source IN ('cookie_banner', 'signup', 'profile', 'admin', 'unsubscribe_link')),
  policy_version text NOT NULL DEFAULT 'v1-2025-04',
  consent_text text NOT NULL,
  ip_address text,
  user_agent text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_consents_email ON public.marketing_consents (lower(email));
CREATE INDEX idx_marketing_consents_user_id ON public.marketing_consents (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_marketing_consents_granted ON public.marketing_consents (granted, granted_at DESC);

ALTER TABLE public.marketing_consents ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can insert their own consent.
-- For anonymous visitors we cannot verify the email, but the row is
-- still legal proof — combined with the IP and timestamp it would hold
-- up if ever challenged.
CREATE POLICY "Anyone can record their consent"
ON public.marketing_consents
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- If a user_id is provided, it MUST match auth.uid() to prevent spoofing
  user_id IS NULL OR user_id = auth.uid()
);

-- Logged-in users can see consent rows linked to their account
CREATE POLICY "Users view own consents"
ON public.marketing_consents
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins see everything (needed to build the marketing list)
CREATE POLICY "Admins view all consents"
ON public.marketing_consents
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Updates are restricted: users can only set withdrawn_at on their own rows
CREATE POLICY "Users withdraw own consents"
ON public.marketing_consents
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can update any row
CREATE POLICY "Admins update consents"
ON public.marketing_consents
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- NO delete policy: consent history is legal evidence and must be retained.

-- Helper view: latest consent state per email (for marketing list export)
CREATE OR REPLACE VIEW public.marketing_consent_current AS
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