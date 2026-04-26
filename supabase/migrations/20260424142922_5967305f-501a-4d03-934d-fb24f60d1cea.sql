-- CTA event tracking (privacy-vriendelijk: geen cookies, geen IP, geen user agent)
CREATE TABLE public.cta_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cta_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  referrer TEXT,
  language TEXT,
  viewport_width INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_cta_events_cta_id ON public.cta_events(cta_id);
CREATE INDEX idx_cta_events_created_at ON public.cta_events(created_at DESC);
CREATE INDEX idx_cta_events_cta_created ON public.cta_events(cta_id, created_at DESC);

ALTER TABLE public.cta_events ENABLE ROW LEVEL SECURITY;

-- Iedereen (anoniem of ingelogd) mag een klik registreren
CREATE POLICY "Anyone can log CTA clicks"
ON public.cta_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Alleen admins mogen de data inzien
CREATE POLICY "Admins can view CTA events"
ON public.cta_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Aggregatie-functie voor admin dashboard (laatste N dagen)
CREATE OR REPLACE FUNCTION public.get_cta_stats(_days INTEGER DEFAULT 30)
RETURNS TABLE (
  cta_id TEXT,
  total_clicks BIGINT,
  clicks_last_7d BIGINT,
  clicks_last_24h BIGINT,
  last_click_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.cta_id,
    COUNT(*)::BIGINT AS total_clicks,
    COUNT(*) FILTER (WHERE e.created_at > now() - INTERVAL '7 days')::BIGINT AS clicks_last_7d,
    COUNT(*) FILTER (WHERE e.created_at > now() - INTERVAL '24 hours')::BIGINT AS clicks_last_24h,
    MAX(e.created_at) AS last_click_at
  FROM public.cta_events e
  WHERE e.created_at > now() - (_days || ' days')::INTERVAL
    AND public.has_role(auth.uid(), 'admin')
  GROUP BY e.cta_id
  ORDER BY total_clicks DESC;
$$;