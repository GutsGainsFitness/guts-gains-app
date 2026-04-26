-- Vervang FOR ALL met expliciete policies (lost USING(true) warnings op)
DROP POLICY IF EXISTS "Manage plan exercises follows plan" ON public.workout_plan_exercises;
DROP POLICY IF EXISTS "Users manage own set logs" ON public.workout_set_logs;

-- workout_plan_exercises: aparte policies per actie
CREATE POLICY "Insert plan exercises follows plan"
  ON public.workout_plan_exercises FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_id
        AND ((wp.user_id = auth.uid() AND wp.is_premade = false) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Update plan exercises follows plan"
  ON public.workout_plan_exercises FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_id
        AND ((wp.user_id = auth.uid() AND wp.is_premade = false) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "Delete plan exercises follows plan"
  ON public.workout_plan_exercises FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = plan_id
        AND ((wp.user_id = auth.uid() AND wp.is_premade = false) OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

-- workout_set_logs: aparte policies per actie
CREATE POLICY "Users insert own set logs"
  ON public.workout_set_logs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid())
  );

CREATE POLICY "Users update own set logs"
  ON public.workout_set_logs FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid())
  );

CREATE POLICY "Users delete own set logs"
  ON public.workout_set_logs FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid())
  );