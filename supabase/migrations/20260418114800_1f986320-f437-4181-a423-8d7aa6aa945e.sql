-- ============================================
-- 1. RUNS TABLE
-- ============================================
CREATE TABLE public.runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  distance_km NUMERIC(6,2) NOT NULL CHECK (distance_km > 0 AND distance_km < 500),
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0 AND duration_seconds < 86400),
  pace_seconds_per_km INTEGER GENERATED ALWAYS AS ((duration_seconds / distance_km)::INTEGER) STORED,
  route_name TEXT,
  notes TEXT,
  perceived_effort SMALLINT CHECK (perceived_effort BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_runs_user_date ON public.runs(user_id, run_date DESC);
CREATE INDEX idx_runs_date ON public.runs(run_date DESC);

ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own runs" ON public.runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own runs" ON public.runs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own runs" ON public.runs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own runs" ON public.runs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all runs" ON public.runs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_runs_updated_at
BEFORE UPDATE ON public.runs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. RUNNING LEADERBOARD FUNCTION (current month)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_running_leaderboard(_gender TEXT DEFAULT NULL)
RETURNS TABLE(
  rank_position INTEGER,
  first_name TEXT,
  total_km NUMERIC,
  run_count BIGINT,
  best_pace_seconds INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH monthly AS (
    SELECT
      r.user_id,
      SUM(r.distance_km) AS total_km,
      COUNT(*) AS run_count,
      MIN(r.pace_seconds_per_km) AS best_pace_seconds
    FROM public.runs r
    WHERE r.run_date >= date_trunc('month', CURRENT_DATE)
      AND r.run_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    GROUP BY r.user_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY m.total_km DESC, m.best_pace_seconds ASC NULLS LAST)::int AS rank_position,
    COALESCE(NULLIF(split_part(COALESCE(p.naam, ''), ' ', 1), ''), 'Atleet') AS first_name,
    ROUND(m.total_km, 2) AS total_km,
    m.run_count,
    m.best_pace_seconds
  FROM monthly m
  LEFT JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.total_km > 0
    AND (
      _gender IS NULL
      OR _gender = ''
      OR p.geslacht::text = _gender
    )
  ORDER BY m.total_km DESC, m.best_pace_seconds ASC NULLS LAST
  LIMIT 20;
$$;

-- ============================================
-- 3. BOOTCAMP EXERCISES (outdoor bodyweight)
-- ============================================
INSERT INTO public.exercises (slug, name, primary_muscle, secondary_muscles, equipment, difficulty, description, instructions, tips) VALUES
('burpees', 'Burpees', 'full_body', ARRAY['chest','quads','shoulders','abs']::muscle_group[], 'bodyweight', 'intermediate',
 'Een explosieve full-body oefening die kracht en cardio combineert. Perfect voor bootcamp en HIIT.',
 '1. Start staand. 2. Zak in squat en plaats handen op de grond. 3. Spring met je voeten naar achteren in plank. 4. Doe een push-up (optioneel). 5. Spring met voeten terug naar je handen. 6. Spring explosief omhoog met je armen boven je hoofd.',
 'Houd je core gespannen tijdens de plank. Land zacht op je voeten. Schaal naar stap-back burpees als de sprong te zwaar is.'),

('jumping-jacks', 'Jumping Jacks', 'full_body', ARRAY['shoulders','calves','cardio']::muscle_group[], 'bodyweight', 'beginner',
 'Klassieke warming-up oefening. Verhoogt hartslag en activeert het hele lichaam.',
 '1. Start staand met armen langs je lichaam. 2. Spring tegelijk met benen uit elkaar en armen omhoog. 3. Spring weer terug naar startpositie. 4. Herhaal in een vloeiend ritme.',
 'Land op de bal van je voet. Houd een constant tempo aan. Adem ritmisch.'),

('mountain-climbers', 'Mountain Climbers', 'abs', ARRAY['shoulders','quads','cardio']::muscle_group[], 'bodyweight', 'beginner',
 'Cardio-core oefening die buikspieren en uithouding traint.',
 '1. Begin in een hoge plank positie. 2. Trek je rechterknie naar je borst. 3. Wissel snel met je linkerknie. 4. Blijf afwisselen in een hardloop-ritme.',
 'Houd je heupen laag. Span je core continu aan. Niet te snel als je de vorm verliest.'),

('high-knees', 'High Knees', 'quads', ARRAY['hamstrings','glutes','cardio']::muscle_group[], 'bodyweight', 'beginner',
 'Hardloopoefening op de plek met hoge knieheffing. Cardio + onderlichaam.',
 '1. Start staand. 2. Ren op de plek en til je knieën hoog op (heuphoogte). 3. Beweeg je armen mee zoals bij hardlopen. 4. Houd het tempo hoog.',
 'Land op de bal van je voet. Kijk recht vooruit. Activeer je core voor balans.'),

('squat-jumps', 'Squat Jumps', 'quads', ARRAY['glutes','hamstrings','calves']::muscle_group[], 'bodyweight', 'intermediate',
 'Plyometrische squat voor explosieve beenkracht. Bouwt sprint-power.',
 '1. Start in een squat positie. 2. Spring explosief omhoog en strek je benen volledig. 3. Land zacht in een squat positie. 4. Herhaal direct.',
 'Land zacht op je hele voet. Houd je borst rechtop. Knieën in lijn met je tenen.'),

('push-ups', 'Push-ups', 'chest', ARRAY['triceps','shoulders','abs']::muscle_group[], 'bodyweight', 'beginner',
 'Klassieke borst-oefening. Schaalbaar voor elk niveau.',
 '1. Plaats handen iets breder dan schouderbreedte. 2. Lichaam recht in plank. 3. Zak omlaag tot je borst bijna de grond raakt. 4. Druk explosief omhoog.',
 'Houd ellebogen onder 45° hoek. Span billen en core. Schaal op je knieën als nodig.'),

('lunges', 'Lunges', 'quads', ARRAY['glutes','hamstrings']::muscle_group[], 'bodyweight', 'beginner',
 'Eenzijdige beenoefening voor kracht en balans. Essentieel voor hardlopers.',
 '1. Stap naar voren met één been. 2. Zak omlaag tot beide knieën 90° hoek vormen. 3. Druk je terug omhoog naar startpositie. 4. Wissel van been.',
 'Voorste knie boven enkel, niet voorbij teen. Houd torso rechtop. Kleine stappen voor balans.'),

('walking-lunges', 'Walking Lunges', 'quads', ARRAY['glutes','hamstrings','calves']::muscle_group[], 'bodyweight', 'intermediate',
 'Lopende lunges voor functionele kracht en uithouding.',
 '1. Stap naar voren in een lunge. 2. Druk omhoog en stap direct door met andere been in volgende lunge. 3. Loop zo door over de afgesproken afstand.',
 'Houd je heupen vierkant. Adem in op de zak, uit op de duw.'),

('plank', 'Plank', 'abs', ARRAY['shoulders','lower_back','glutes']::muscle_group[], 'bodyweight', 'beginner',
 'Isometrische core-oefening. Bouwt rompstabiliteit op.',
 '1. Onderarmen op de grond, ellebogen onder schouders. 2. Lichaam in een rechte lijn van hoofd tot hielen. 3. Span buik en billen aan. 4. Houd de positie vast.',
 'Niet doorzakken in de heupen. Adem rustig door. Begin met 20 seconden, bouw op.'),

('side-plank', 'Side Plank', 'obliques', ARRAY['shoulders','abs']::muscle_group[], 'bodyweight', 'intermediate',
 'Zijdelingse plank voor schuine buikspieren en stabiliteit.',
 '1. Lig op je zij, onderarm onder schouder. 2. Til je heupen op zodat je lichaam een rechte lijn vormt. 3. Houd vast en wissel daarna van zijde.',
 'Stapel je voeten of plaats bovenste voor onderste. Heupen hoog houden.'),

('bear-crawl', 'Bear Crawl', 'full_body', ARRAY['shoulders','abs','quads']::muscle_group[], 'bodyweight', 'intermediate',
 'Quadrupedale beweging voor coördinatie, kracht en cardio.',
 '1. Start op handen en voeten met knieën 2-5cm boven de grond. 2. Beweeg tegenovergestelde hand en voet tegelijk vooruit. 3. Houd knieën laag en heupen stabiel.',
 'Houd je rug vlak. Knieën blijven net boven de grond. Korte passen.'),

('glute-bridge', 'Glute Bridge', 'glutes', ARRAY['hamstrings','lower_back']::muscle_group[], 'bodyweight', 'beginner',
 'Activeert en versterkt de bilspieren. Ideaal voor hardlopers en posture.',
 '1. Lig op je rug, knieën gebogen, voeten plat op de grond. 2. Knijp billen en duw heupen omhoog tot je een rechte lijn vormt. 3. Houd 1 sec, zak gecontroleerd terug.',
 'Druk door je hielen. Knijp bewust de billen aan. Niet overstrekken in de onderrug.'),

('crunches', 'Crunches', 'abs', ARRAY[]::muscle_group[], 'bodyweight', 'beginner',
 'Klassieke buikspieroefening die de bovenste buikspieren targetet.',
 '1. Lig op je rug, knieën gebogen, handen achter je hoofd. 2. Til je schouders los van de grond door je buikspieren te spannen. 3. Zak gecontroleerd terug.',
 'Geen ruk aan je nek. Kin van je borst houden. Focus op de samentrekking.'),

('russian-twists', 'Russian Twists', 'obliques', ARRAY['abs']::muscle_group[], 'bodyweight', 'intermediate',
 'Roterende core-oefening voor schuine buikspieren.',
 '1. Zit met knieën gebogen, leun licht achterover. 2. Til voeten van de grond (optioneel). 3. Roteer je torso van links naar rechts en raak de grond aan elke kant.',
 'Houd je borst open. Beweeg vanuit je core, niet je armen.'),

('jump-rope', 'Touwtje Springen', 'cardio', ARRAY['calves','shoulders']::muscle_group[], 'bodyweight', 'beginner',
 'Klassieke cardio. Verbetert coördinatie, voetwerk en uithouding.',
 '1. Houd touw losjes vast bij heupen. 2. Spring met beide voeten tegelijk over het touw. 3. Land zacht op de bal van je voet. 4. Pols-rotatie zwaait het touw, geen armen.',
 'Klein hoppen. Blijf op de bal van je voet. Imaginair touw is prima zonder echt touw.'),

('sprints', 'Sprints', 'cardio', ARRAY['quads','glutes','hamstrings','calves']::muscle_group[], 'bodyweight', 'intermediate',
 'Korte explosieve hardloopintervallen. Bouwt snelheid en VO2max.',
 '1. Warm goed op met joggen + dynamische stretches. 2. Sprint maximaal voor de afgesproken afstand of tijd. 3. Wandel of jog rustig terug als rust. 4. Herhaal.',
 'Volledige inzet tijdens sprint, volledig herstel daarna. Vorm gaat boven snelheid.'),

('tuck-jumps', 'Tuck Jumps', 'quads', ARRAY['abs','calves']::muscle_group[], 'bodyweight', 'advanced',
 'Plyometrische sprong waarbij je je knieën naar je borst trekt. Explosieve power.',
 '1. Start staand. 2. Spring zo hoog mogelijk. 3. Trek tijdens de sprong je knieën naar je borst. 4. Land zacht en spring direct opnieuw.',
 'Zacht landen op de bal van je voet. Knieën licht buigen bij landing om impact te absorberen.'),

('broad-jump', 'Broad Jump', 'quads', ARRAY['glutes','hamstrings','calves']::muscle_group[], 'bodyweight', 'intermediate',
 'Horizontale sprong voor explosieve kracht. Bouwt sprint-acceleratie.',
 '1. Start in een lichte squat. 2. Zwaai je armen naar achteren. 3. Spring zo ver mogelijk naar voren met armzwaai. 4. Land zacht in een squat positie.',
 'Focus op afstand, niet hoogte. Land zacht met gebogen knieën. Loop terug naar startpositie als rust.')

ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 4. BOOTCAMP WORKOUT PLANS (premade)
-- ============================================
INSERT INTO public.workout_plans (id, name, description, focus, difficulty, estimated_duration_min, is_premade, user_id) VALUES
('11111111-1111-1111-1111-bbbb00000001', 'Bootcamp — Full Body', 'Complete outdoor workout met alle grote spiergroepen. Geen apparatuur nodig. Ideaal voor in het park of op het strand.', 'full_body', 'beginner', 35, true, NULL),
('11111111-1111-1111-1111-bbbb00000002', 'Bootcamp — HIIT Blast', 'Hoge intensiteit interval training. Korte explosieve rondes, weinig rust. Verbrandt veel calorieën in korte tijd.', 'cardio', 'intermediate', 25, true, NULL),
('11111111-1111-1111-1111-bbbb00000003', 'Bootcamp — Legs & Booty', 'Onderlichaam focus. Bouwt kracht in benen en billen. Perfect voor hardlopers die sterker willen worden.', 'legs', 'intermediate', 30, true, NULL),
('11111111-1111-1111-1111-bbbb00000004', 'Bootcamp — Upper Body', 'Bovenlichaam workout op bodyweight. Borst, schouders, armen en core. Geen gewichten nodig.', 'push', 'beginner', 30, true, NULL),
('11111111-1111-1111-1111-bbbb00000005', 'Bootcamp — Core Crusher', 'Intensieve core en buikspier workout. Versterkt je romp voor betere prestaties bij elke andere activiteit.', 'core', 'beginner', 20, true, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. LINK EXERCISES TO PLANS
-- ============================================
DO $$
DECLARE
  -- Plan IDs
  p_full UUID := '11111111-1111-1111-1111-bbbb00000001';
  p_hiit UUID := '11111111-1111-1111-1111-bbbb00000002';
  p_legs UUID := '11111111-1111-1111-1111-bbbb00000003';
  p_upper UUID := '11111111-1111-1111-1111-bbbb00000004';
  p_core UUID := '11111111-1111-1111-1111-bbbb00000005';
  
  -- Exercise IDs (lookup by slug)
  e_jj UUID; e_hk UUID; e_burp UUID; e_mc UUID; e_sj UUID;
  e_pu UUID; e_lung UUID; e_wlung UUID; e_plank UUID; e_sp UUID;
  e_bc UUID; e_gb UUID; e_cr UUID; e_rt UUID; e_jr UUID;
  e_spr UUID; e_tj UUID; e_bj UUID;
BEGIN
  SELECT id INTO e_jj FROM public.exercises WHERE slug = 'jumping-jacks';
  SELECT id INTO e_hk FROM public.exercises WHERE slug = 'high-knees';
  SELECT id INTO e_burp FROM public.exercises WHERE slug = 'burpees';
  SELECT id INTO e_mc FROM public.exercises WHERE slug = 'mountain-climbers';
  SELECT id INTO e_sj FROM public.exercises WHERE slug = 'squat-jumps';
  SELECT id INTO e_pu FROM public.exercises WHERE slug = 'push-ups';
  SELECT id INTO e_lung FROM public.exercises WHERE slug = 'lunges';
  SELECT id INTO e_wlung FROM public.exercises WHERE slug = 'walking-lunges';
  SELECT id INTO e_plank FROM public.exercises WHERE slug = 'plank';
  SELECT id INTO e_sp FROM public.exercises WHERE slug = 'side-plank';
  SELECT id INTO e_bc FROM public.exercises WHERE slug = 'bear-crawl';
  SELECT id INTO e_gb FROM public.exercises WHERE slug = 'glute-bridge';
  SELECT id INTO e_cr FROM public.exercises WHERE slug = 'crunches';
  SELECT id INTO e_rt FROM public.exercises WHERE slug = 'russian-twists';
  SELECT id INTO e_jr FROM public.exercises WHERE slug = 'jump-rope';
  SELECT id INTO e_spr FROM public.exercises WHERE slug = 'sprints';
  SELECT id INTO e_tj FROM public.exercises WHERE slug = 'tuck-jumps';
  SELECT id INTO e_bj FROM public.exercises WHERE slug = 'broad-jump';

  -- FULL BODY (8 exercises)
  INSERT INTO public.workout_plan_exercises (plan_id, exercise_id, position, target_sets, target_reps, rest_seconds) VALUES
    (p_full, e_jj, 0, 3, '45 sec', 30),
    (p_full, e_burp, 1, 4, '10', 60),
    (p_full, e_pu, 2, 3, '12-15', 60),
    (p_full, e_lung, 3, 3, '10 per been', 60),
    (p_full, e_mc, 4, 3, '40 sec', 45),
    (p_full, e_plank, 5, 3, '45 sec', 45),
    (p_full, e_sj, 6, 3, '12', 60),
    (p_full, e_gb, 7, 3, '15', 45)
  ON CONFLICT DO NOTHING;

  -- HIIT BLAST (6 exercises - work hard rest short)
  INSERT INTO public.workout_plan_exercises (plan_id, exercise_id, position, target_sets, target_reps, rest_seconds) VALUES
    (p_hiit, e_hk, 0, 4, '30 sec', 15),
    (p_hiit, e_burp, 1, 4, '30 sec', 15),
    (p_hiit, e_sj, 2, 4, '30 sec', 15),
    (p_hiit, e_mc, 3, 4, '30 sec', 15),
    (p_hiit, e_tj, 4, 3, '20 sec', 30),
    (p_hiit, e_jr, 5, 4, '45 sec', 20)
  ON CONFLICT DO NOTHING;

  -- LEGS & BOOTY (7 exercises)
  INSERT INTO public.workout_plan_exercises (plan_id, exercise_id, position, target_sets, target_reps, rest_seconds) VALUES
    (p_legs, e_jj, 0, 2, '45 sec', 30),
    (p_legs, e_lung, 1, 4, '12 per been', 60),
    (p_legs, e_sj, 2, 4, '15', 75),
    (p_legs, e_wlung, 3, 3, '20 stappen', 60),
    (p_legs, e_gb, 4, 4, '20', 45),
    (p_legs, e_bj, 5, 3, '8', 90),
    (p_legs, e_hk, 6, 3, '45 sec', 30)
  ON CONFLICT DO NOTHING;

  -- UPPER BODY (6 exercises)
  INSERT INTO public.workout_plan_exercises (plan_id, exercise_id, position, target_sets, target_reps, rest_seconds) VALUES
    (p_upper, e_jj, 0, 2, '45 sec', 30),
    (p_upper, e_pu, 1, 4, '10-15', 75),
    (p_upper, e_bc, 2, 3, '40 sec', 60),
    (p_upper, e_plank, 3, 3, '60 sec', 45),
    (p_upper, e_sp, 4, 3, '30 sec per zijde', 45),
    (p_upper, e_burp, 5, 3, '8', 60)
  ON CONFLICT DO NOTHING;

  -- CORE CRUSHER (6 exercises)
  INSERT INTO public.workout_plan_exercises (plan_id, exercise_id, position, target_sets, target_reps, rest_seconds) VALUES
    (p_core, e_plank, 0, 3, '45 sec', 30),
    (p_core, e_mc, 1, 3, '40 sec', 30),
    (p_core, e_cr, 2, 3, '20', 30),
    (p_core, e_rt, 3, 3, '30 sec', 30),
    (p_core, e_sp, 4, 3, '30 sec per zijde', 30),
    (p_core, e_bc, 5, 3, '40 sec', 45)
  ON CONFLICT DO NOTHING;
END $$;