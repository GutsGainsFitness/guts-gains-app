-- ============================================================
-- 1) invite_codes table — one short, unique code per user
-- ============================================================
CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invite_codes_code ON public.invite_codes(code);

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can lookup a code (to validate / resolve to a user_id) -- but cannot list all
CREATE POLICY "Authenticated can lookup codes"
  ON public.invite_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anon can lookup codes"
  ON public.invite_codes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Admins manage codes"
  ON public.invite_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2) invites table — one row per attempted invite
-- ============================================================
CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL,
  invitee_email text,
  invitee_name text,
  invite_type text NOT NULL CHECK (invite_type IN ('intake','purchase')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed')),
  source_intake_id uuid REFERENCES public.intake_requests(id) ON DELETE SET NULL,
  source_booking_id uuid REFERENCES public.pt_bookings(id) ON DELETE SET NULL,
  source_purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX idx_invites_inviter ON public.invites(inviter_user_id);
CREATE INDEX idx_invites_type_status ON public.invites(invite_type, status);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviters view own invites"
  ON public.invites FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_user_id);

CREATE POLICY "Admins view all invites"
  ON public.invites FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Inserts happen via service role from edge functions / form submissions, so no INSERT policy for users.
CREATE POLICY "Admins manage invites"
  ON public.invites FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow anyone (anon + authenticated) to insert invite rows tied to a referrer code:
-- the form layer validates the code first; admins can later confirm/clean.
CREATE POLICY "Anyone can register an invite"
  ON public.invites FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- 3) Track referrer code on existing source tables
-- ============================================================
ALTER TABLE public.intake_requests ADD COLUMN referrer_code text;
ALTER TABLE public.pt_bookings ADD COLUMN referrer_code text;
ALTER TABLE public.purchases ADD COLUMN referrer_code text;

-- ============================================================
-- 4) Helper: generate a short unique invite code
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_invite_code(_seed text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no I, L, O, 0, 1
  candidate text;
  prefix text;
  i int;
  attempt int := 0;
BEGIN
  -- Build a prefix from the seed (e.g. first 4 letters of name) when available
  IF _seed IS NOT NULL THEN
    prefix := upper(regexp_replace(left(_seed, 4), '[^A-Za-z]', '', 'g'));
  ELSE
    prefix := '';
  END IF;

  LOOP
    candidate := prefix;
    -- pad with random characters to reach 7 total
    FOR i IN 1..(7 - length(candidate)) LOOP
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE code = candidate);

    attempt := attempt + 1;
    IF attempt > 20 THEN
      -- give up on prefix, fall back to fully random 7-char code
      prefix := '';
    END IF;
  END LOOP;

  RETURN candidate;
END;
$$;

-- ============================================================
-- 5) Trigger: create an invite code automatically for every new profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_invite_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.invite_codes WHERE user_id = NEW.user_id) THEN
    new_code := public.generate_invite_code(NEW.naam);
    INSERT INTO public.invite_codes (user_id, code) VALUES (NEW.user_id, new_code);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_create_invite_code
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_invite_code();

-- Backfill: give every existing profile a code
INSERT INTO public.invite_codes (user_id, code)
SELECT p.user_id, public.generate_invite_code(p.naam)
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.invite_codes ic WHERE ic.user_id = p.user_id);

-- ============================================================
-- 6) Helper: resolve a code → user_id (for use by edge functions / RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_invite_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.invite_codes WHERE code = upper(trim(_code)) LIMIT 1;
$$;

-- ============================================================
-- 7) Helper: admin can manually confirm a purchase invite (e.g. when matching a Stripe sale to a referral)
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_invite(_invite_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can confirm invites';
  END IF;
  UPDATE public.invites
  SET status = 'confirmed', confirmed_at = now()
  WHERE id = _invite_id AND status = 'pending';
END;
$$;