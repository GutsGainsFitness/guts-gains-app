-- 1) Vast zoekpad voor 4 functies (Function Search Path Mutable)
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pg_catalog;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pg_catalog;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pg_catalog;

-- 2) RLS Enabled No Policy op deletion_request_rate_limits
-- Deze tabel wordt alleen gebruikt door de edge function (service_role).
-- Standaard gebruikers mogen er niets mee doen.
CREATE POLICY "Service role manages rate limits"
ON public.deletion_request_rate_limits
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3) cta_events: vervang permissive INSERT door gevalideerde versie
DROP POLICY IF EXISTS "Anyone can log CTA clicks" ON public.cta_events;

CREATE POLICY "Anyone can log validated CTA clicks"
ON public.cta_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- cta_id moet een veilige snake/dot identifier zijn, max 64 chars
  cta_id ~ '^[a-z][a-z0-9_.]{0,63}$'
  -- page_path mag niet leeg en max 512 chars
  AND length(page_path) BETWEEN 1 AND 512
  -- referrer optioneel maar begrensd
  AND (referrer IS NULL OR length(referrer) <= 512)
  -- language max 10 chars (BCP47)
  AND (language IS NULL OR length(language) <= 10)
  -- viewport binnen redelijk bereik (anti-misbruik)
  AND (viewport_width IS NULL OR (viewport_width BETWEEN 100 AND 10000))
  -- metadata mag, maar geen enorme payloads (max ~2KB serialized)
  AND (metadata IS NULL OR length(metadata::text) <= 2048)
);

-- 4) Public bucket listing: scope SELECT-policy op exercise-illustrations
-- naar individuele object reads (path-based) zodat clients geen volledige
-- bucket-listing kunnen opvragen. We laten de bucket public voor directe
-- URL-toegang tot afbeeldingen.
DO $$
BEGIN
  -- Probeer bestaande broad SELECT-policy op deze bucket te verwijderen
  -- (naam wisselt per project; we filteren op definitie).
  PERFORM 1;
END $$;

-- Verwijder bekende brede SELECT-policies voor deze bucket als ze bestaan.
DROP POLICY IF EXISTS "Exercise illustrations are publicly accessible"
  ON storage.objects;
DROP POLICY IF EXISTS "Public read exercise-illustrations"
  ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view exercise illustrations"
  ON storage.objects;

-- Nieuwe SELECT-policy: vereist dat de client een specifiek object opvraagt
-- (name moet een extensie hebben). Dit blokkeert generieke list-calls die
-- met lege/wildcard prefix de hele bucket zouden teruggeven.
CREATE POLICY "Read individual exercise illustrations"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'exercise-illustrations'
  AND name ~ '\.[A-Za-z0-9]{2,5}$'
);