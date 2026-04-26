ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS avg_heart_rate integer,
  ADD COLUMN IF NOT EXISTS max_heart_rate integer,
  ADD COLUMN IF NOT EXISTS hr_source text;

ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_avg_hr_range CHECK (avg_heart_rate IS NULL OR (avg_heart_rate BETWEEN 30 AND 250)),
  ADD CONSTRAINT workout_sessions_max_hr_range CHECK (max_heart_rate IS NULL OR (max_heart_rate BETWEEN 30 AND 250)),
  ADD CONSTRAINT workout_sessions_hr_source_valid CHECK (hr_source IS NULL OR hr_source IN ('manual', 'bluetooth', 'smartwatch'));