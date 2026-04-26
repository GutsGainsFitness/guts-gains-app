
CREATE TABLE public.intake_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  naam TEXT NOT NULL,
  email TEXT NOT NULL,
  telefoon TEXT NOT NULL,
  doel TEXT,
  voorkeur TEXT,
  bericht TEXT,
  status TEXT NOT NULL DEFAULT 'nieuw',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_requests_status ON public.intake_requests(status);
CREATE INDEX idx_intake_requests_created ON public.intake_requests(created_at DESC);

ALTER TABLE public.intake_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit intake"
  ON public.intake_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view intakes"
  ON public.intake_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update intakes"
  ON public.intake_requests FOR UPDATE
  TO authenticated
  USING (true);

CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  product_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchases_created ON public.purchases(created_at DESC);

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view purchases"
  ON public.purchases FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can insert purchases"
  ON public.purchases FOR INSERT
  TO service_role
  WITH CHECK (true);
