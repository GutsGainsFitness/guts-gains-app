CREATE TABLE public.deletion_request_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deletion_rate_limits_ip_time
  ON public.deletion_request_rate_limits (ip_hash, created_at DESC);

ALTER TABLE public.deletion_request_rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon/authenticated users.
-- Only the service role (used by the edge function) can read/write.
