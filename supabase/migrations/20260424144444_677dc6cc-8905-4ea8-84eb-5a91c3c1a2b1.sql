CREATE OR REPLACE FUNCTION public.get_cta_variant_stats(_days integer DEFAULT 30)
RETURNS TABLE(
  cta_id text,
  variant text,
  total_clicks bigint,
  total_impressions bigint,
  ctr_pct numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  WITH clicks AS (
    SELECT
      e.cta_id,
      COALESCE(NULLIF(e.metadata->>'variant', ''), 'unknown') AS variant,
      COUNT(*)::BIGINT AS total_clicks
    FROM public.cta_events e
    WHERE e.created_at > now() - (_days || ' days')::INTERVAL
      AND public.has_role(auth.uid(), 'admin')
    GROUP BY e.cta_id, COALESCE(NULLIF(e.metadata->>'variant', ''), 'unknown')
  ),
  imps AS (
    SELECT
      i.cta_id,
      COALESCE(NULLIF(i.metadata->>'variant', ''), 'unknown') AS variant,
      COUNT(*)::BIGINT AS total_impressions
    FROM public.cta_impressions i
    WHERE i.created_at > now() - (_days || ' days')::INTERVAL
      AND public.has_role(auth.uid(), 'admin')
    GROUP BY i.cta_id, COALESCE(NULLIF(i.metadata->>'variant', ''), 'unknown')
  )
  SELECT
    COALESCE(c.cta_id, i.cta_id) AS cta_id,
    COALESCE(c.variant, i.variant) AS variant,
    COALESCE(c.total_clicks, 0) AS total_clicks,
    COALESCE(i.total_impressions, 0) AS total_impressions,
    CASE WHEN COALESCE(i.total_impressions, 0) > 0
      THEN ROUND((COALESCE(c.total_clicks, 0)::numeric / i.total_impressions::numeric) * 100, 2)
      ELSE NULL
    END AS ctr_pct
  FROM clicks c
  FULL OUTER JOIN imps i
    ON i.cta_id = c.cta_id AND i.variant = c.variant
  ORDER BY
    COALESCE(c.cta_id, i.cta_id),
    COALESCE(i.total_impressions, 0) DESC;
$function$;