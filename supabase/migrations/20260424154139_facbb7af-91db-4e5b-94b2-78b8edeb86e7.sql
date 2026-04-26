ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS gif_url_1 text,
  ADD COLUMN IF NOT EXISTS gif_url_2 text;