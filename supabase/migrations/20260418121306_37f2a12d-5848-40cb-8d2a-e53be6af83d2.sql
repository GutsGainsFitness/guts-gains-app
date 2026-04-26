-- Track when an achievement reward has been physically handed out by Pablo.
ALTER TABLE public.user_achievements
ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Allow admins to mark rewards as claimed.
CREATE POLICY "Admins can update achievements"
ON public.user_achievements
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Helpful index for "open beloningen" filter.
CREATE INDEX IF NOT EXISTS idx_user_achievements_unclaimed
  ON public.user_achievements (unlocked_at DESC)
  WHERE claimed_at IS NULL;