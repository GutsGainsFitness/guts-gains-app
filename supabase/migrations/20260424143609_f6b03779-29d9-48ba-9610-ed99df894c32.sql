-- 1) Verwijder oude brede SELECT-policy op exercise-illustrations bucket
DROP POLICY IF EXISTS "Exercise illustrations publicly viewable" ON storage.objects;

-- 2) intake_requests: vervang permissive INSERT door gevalideerde versie
DROP POLICY IF EXISTS "Anyone can submit intake" ON public.intake_requests;

CREATE POLICY "Anyone can submit validated intake"
ON public.intake_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(naam) BETWEEN 1 AND 200
  AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND length(email) BETWEEN 3 AND 320
  AND length(telefoon) BETWEEN 3 AND 50
  AND (doel IS NULL OR length(doel) <= 200)
  AND (voorkeur IS NULL OR length(voorkeur) <= 200)
  AND (bericht IS NULL OR length(bericht) <= 5000)
  AND (referrer_code IS NULL OR length(referrer_code) <= 64)
  AND (selected_time_slot IS NULL OR length(selected_time_slot) <= 200)
);

-- 3) pt_bookings: vervang permissive INSERT door gevalideerde versie
DROP POLICY IF EXISTS "Anyone can submit a PT booking" ON public.pt_bookings;

CREATE POLICY "Anyone can submit validated PT booking"
ON public.pt_bookings
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(naam) BETWEEN 1 AND 200
  AND email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  AND length(email) BETWEEN 3 AND 320
  AND length(telefoon) BETWEEN 3 AND 50
  AND length(selected_time_slot) BETWEEN 1 AND 200
  AND selected_date >= CURRENT_DATE - INTERVAL '1 day'
  AND selected_date <= CURRENT_DATE + INTERVAL '1 year'
  AND (bericht IS NULL OR length(bericht) <= 5000)
  AND (referrer_code IS NULL OR length(referrer_code) <= 64)
);

-- 4) invites: vervang permissive INSERT door gevalideerde versie
DROP POLICY IF EXISTS "Anyone can register an invite" ON public.invites;

CREATE POLICY "Anyone can register validated invite"
ON public.invites
FOR INSERT
TO anon, authenticated
WITH CHECK (
  invite_type IN ('intake', 'booking', 'purchase', 'signup')
  AND inviter_user_id IS NOT NULL
  AND (invitee_name IS NULL OR length(invitee_name) <= 200)
  AND (invitee_email IS NULL OR (
    invitee_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    AND length(invitee_email) BETWEEN 3 AND 320
  ))
);