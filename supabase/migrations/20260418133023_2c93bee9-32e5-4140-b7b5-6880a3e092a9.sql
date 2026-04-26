-- Achievements
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_es text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS reward_en text,
  ADD COLUMN IF NOT EXISTS reward_es text;

-- Exercises
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_es text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_es text,
  ADD COLUMN IF NOT EXISTS instructions_en text,
  ADD COLUMN IF NOT EXISTS instructions_es text,
  ADD COLUMN IF NOT EXISTS tips_en text,
  ADD COLUMN IF NOT EXISTS tips_es text;

-- Workout plans
ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS name_es text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS description_es text;