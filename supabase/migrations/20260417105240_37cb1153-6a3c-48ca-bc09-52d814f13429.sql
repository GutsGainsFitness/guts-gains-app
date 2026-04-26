-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.muscle_group AS ENUM (
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'abs', 'obliques', 'glutes', 'quads', 'hamstrings', 'calves',
  'traps', 'lats', 'lower_back', 'full_body', 'cardio'
);

CREATE TYPE public.exercise_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TYPE public.equipment_type AS ENUM (
  'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'
);

CREATE TYPE public.workout_focus AS ENUM (
  'booty', 'chest', 'back', 'legs', 'shoulders', 'arms', 'push', 'pull', 'full_body', 'core', 'cardio'
);

CREATE TYPE public.training_mode AS ENUM ('hypertrofie', 'powerlift', 'uithoudingsvermogen', 'interval');

CREATE TYPE public.gender AS ENUM ('man', 'vrouw', 'anders');

-- ============================================
-- PROFIEL UITBREIDEN (voor calorie berekeningen)
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lengte_cm INTEGER,
  ADD COLUMN IF NOT EXISTS gewicht_kg NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS geslacht public.gender;

-- ============================================
-- EXERCISES (bibliotheek)
-- ============================================
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  primary_muscle public.muscle_group NOT NULL,
  secondary_muscles public.muscle_group[] DEFAULT '{}'::public.muscle_group[],
  equipment public.equipment_type NOT NULL DEFAULT 'bodyweight',
  difficulty public.exercise_difficulty NOT NULL DEFAULT 'beginner',
  description TEXT,
  instructions TEXT,
  tips TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_primary_muscle ON public.exercises(primary_muscle);
CREATE INDEX idx_exercises_equipment ON public.exercises(equipment);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view exercises"
  ON public.exercises FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert exercises"
  ON public.exercises FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update exercises"
  ON public.exercises FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete exercises"
  ON public.exercises FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- WORKOUT PLANS (pre-made + eigen)
-- ============================================
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  focus public.workout_focus NOT NULL DEFAULT 'full_body',
  difficulty public.exercise_difficulty NOT NULL DEFAULT 'beginner',
  estimated_duration_min INTEGER,
  is_premade BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX idx_workout_plans_focus ON public.workout_plans(focus);
CREATE INDEX idx_workout_plans_premade ON public.workout_plans(is_premade);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view premade plans"
  ON public.workout_plans FOR SELECT
  USING (is_premade = true);

CREATE POLICY "Users view own plans"
  ON public.workout_plans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all plans"
  ON public.workout_plans FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own plans"
  ON public.workout_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_premade = false);

CREATE POLICY "Admins create premade plans"
  ON public.workout_plans FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users update own plans"
  ON public.workout_plans FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND is_premade = false);

CREATE POLICY "Admins update plans"
  ON public.workout_plans FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users delete own plans"
  ON public.workout_plans FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND is_premade = false);

CREATE POLICY "Admins delete plans"
  ON public.workout_plans FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_workout_plans_updated_at
  BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- WORKOUT PLAN EXERCISES (koppeling)
-- ============================================
CREATE TABLE public.workout_plan_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps TEXT,
  rest_seconds INTEGER DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wpe_plan_id ON public.workout_plan_exercises(plan_id);

ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View plan exercises follows plan"
  ON public.workout_plan_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_id
        AND (wp.is_premade = true OR wp.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Manage plan exercises follows plan"
  ON public.workout_plan_exercises FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_id
        AND ((wp.user_id = auth.uid() AND wp.is_premade = false) OR has_role(auth.uid(), 'admin'::app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_id
        AND ((wp.user_id = auth.uid() AND wp.is_premade = false) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- ============================================
-- WORKOUT SESSIONS (uitgevoerde trainingen)
-- ============================================
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,
  plan_name_snapshot TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  training_mode public.training_mode NOT NULL DEFAULT 'hypertrofie',
  perceived_intensity INTEGER CHECK (perceived_intensity BETWEEN 1 AND 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, session_date DESC);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions"
  ON public.workout_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sessions"
  ON public.workout_sessions FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own sessions"
  ON public.workout_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sessions"
  ON public.workout_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own sessions"
  ON public.workout_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- WORKOUT SET LOGS (per set bijhouden)
-- ============================================
CREATE TABLE public.workout_set_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  exercise_position INTEGER NOT NULL DEFAULT 0,
  set_number INTEGER NOT NULL DEFAULT 1,
  reps INTEGER,
  weight_kg NUMERIC(6,2),
  rest_seconds INTEGER,
  is_interval BOOLEAN NOT NULL DEFAULT false,
  interval_work_seconds INTEGER,
  interval_rest_seconds INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX idx_set_logs_session ON public.workout_set_logs(session_id);
CREATE INDEX idx_set_logs_exercise ON public.workout_set_logs(exercise_id);

ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own set logs"
  ON public.workout_set_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all set logs"
  ON public.workout_set_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users manage own set logs"
  ON public.workout_set_logs FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = auth.uid()
    )
  );