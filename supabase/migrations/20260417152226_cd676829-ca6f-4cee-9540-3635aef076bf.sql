-- Rank system tier enum
CREATE TYPE public.rank_tier AS ENUM (
  'iron', 'bronze', 'silver', 'gold', 'platinum',
  'diamond', 'master', 'elite', 'champion', 'olympian'
);

-- User ranks table (1 row per user)
CREATE TABLE public.user_ranks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_tier public.rank_tier NOT NULL DEFAULT 'iron',
  current_division SMALLINT NOT NULL DEFAULT 1 CHECK (current_division BETWEEN 1 AND 3),
  total_score NUMERIC NOT NULL DEFAULT 0,
  e1rm_score NUMERIC NOT NULL DEFAULT 0,
  xp_score NUMERIC NOT NULL DEFAULT 0,
  xp_total NUMERIC NOT NULL DEFAULT 0,
  best_squat_e1rm NUMERIC,
  best_bench_e1rm NUMERIC,
  best_deadlift_e1rm NUMERIC,
  bodyweight_snapshot NUMERIC,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rank"
ON public.user_ranks FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own rank"
ON public.user_ranks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rank"
ON public.user_ranks FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view all ranks"
ON public.user_ranks FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_user_ranks_updated_at
BEFORE UPDATE ON public.user_ranks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Optional rank-up history
CREATE TABLE public.rank_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_tier public.rank_tier,
  from_division SMALLINT,
  to_tier public.rank_tier NOT NULL,
  to_division SMALLINT NOT NULL,
  total_score NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rank history"
ON public.rank_history FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own rank history"
ON public.rank_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all rank history"
ON public.rank_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rank_history_user_id ON public.rank_history(user_id, created_at DESC);