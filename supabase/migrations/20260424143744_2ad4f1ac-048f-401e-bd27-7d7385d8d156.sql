-- 1) Impressions table (mirrors cta_events shape)
CREATE TABLE public.cta_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cta_id TEXT NOT NULL,
  page_path TEXT NOT NULL,
  referrer TEXT,
  language TEXT,
  viewport_width INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cta_impressions_cta_id_created_at_idx
  ON public.cta_impressions (cta_id, created_at DESC);

CREATE INDEX cta_impressions_created_at_idx
  ON public.cta_impressions (created_at DESC);

ALTER TABLE public.cta_impressions ENABLE ROW LEVEL SECURITY;

-- Same hardened insert validation as cta_events
CREATE POLICY "Anyone can log validated CTA impressions"
ON public.cta_impressions FOR INSERT
TO anon, authenticated
WITH CHECK (
  cta_id ~ '^[a-z][a-z0-9_.]{0,63}$'
  AND length(page_path) BETWEEN 1 AND 512
  AND (referrer IS NULL OR length(referrer) <= 512)
  AND (language IS NULL OR length(language) <= 10)
  AND (viewport_width IS NULL OR (viewport_width >= 100 AND viewport_width <= 10000))
  AND (metadata IS NULL OR length(metadata::text) <= 2048)
);

CREATE POLICY "Admins can view CTA impressions"
ON public.cta_impressions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) Updated stats function: clicks, impressions, CTR
DROP FUNCTION IF EXISTS public.get_cta_stats(integer);

CREATE OR REPLACE FUNCTION public.get_cta_stats(_days integer DEFAULT 30)
RETURNS TABLE(
  cta_id text,
  total_clicks bigint,
  clicks_last_7d bigint,
  clicks_last_24h bigint,
  total_impressions bigint,
  impressions_last_7d bigint,
  impressions_last_24h bigint,
  ctr_pct numeric,
  ctr_pct_7d numeric,
  last_click_at timestamptz,
  last_impression_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  WITH clicks AS (
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
  ),
  imps AS (
    SELECT
      i.cta_id,
      COUNT(*)::BIGINT AS total_impressions,
      COUNT(*) FILTER (WHERE i.created_at > now() - INTERVAL '7 days')::BIGINT AS impressions_last_7d,
      COUNT(*) FILTER (WHERE i.created_at > now() - INTERVAL '24 hours')::BIGINT AS impressions_last_24h,
      MAX(i.created_at) AS last_impression_at
    FROM public.cta_impressions i
    WHERE i.created_at > now() - (_days || ' days')::INTERVAL
      AND public.has_role(auth.uid(), 'admin')
    GROUP BY i.cta_id
  )
  SELECT
    COALESCE(c.cta_id, i.cta_id) AS cta_id,
    COALESCE(c.total_clicks, 0) AS total_clicks,
    COALESCE(c.clicks_last_7d, 0) AS clicks_last_7d,
    COALESCE(c.clicks_last_24h, 0) AS clicks_last_24h,
    COALESCE(i.total_impressions, 0) AS total_impressions,
    COALESCE(i.impressions_last_7d, 0) AS impressions_last_7d,
    COALESCE(i.impressions_last_24h, 0) AS impressions_last_24h,
    CASE WHEN COALESCE(i.total_impressions, 0) > 0
      THEN ROUND((COALESCE(c.total_clicks, 0)::numeric / i.total_impressions::numeric) * 100, 2)
      ELSE NULL
    END AS ctr_pct,
    CASE WHEN COALESCE(i.impressions_last_7d, 0) > 0
      THEN ROUND((COALESCE(c.clicks_last_7d, 0)::numeric / i.impressions_last_7d::numeric) * 100, 2)
      ELSE NULL
    END AS ctr_pct_7d,
    c.last_click_at,
    i.last_impression_at
  FROM clicks c
  FULL OUTER JOIN imps i ON i.cta_id = c.cta_id
  ORDER BY COALESCE(c.total_clicks, 0) DESC, COALESCE(i.total_impressions, 0) DESC;
$function$;