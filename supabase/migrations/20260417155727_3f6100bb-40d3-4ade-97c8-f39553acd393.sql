-- Catalog table: master list of available achievements
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  icon text NOT NULL,
  threshold numeric,
  rarity text NOT NULL DEFAULT 'common',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievement catalog"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Admins manage achievements"
  ON public.achievements FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User unlocks
CREATE TABLE public.user_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  progress_value numeric,
  UNIQUE(user_id, achievement_key)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own achievements"
  ON public.user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed catalog
INSERT INTO public.achievements (key, name, description, category, icon, threshold, rarity, position) VALUES
  -- Workout count
  ('workout_first',      'First Rep',           'Voltooi je eerste workout',                     'workouts', 'Dumbbell',      1,    'common',    10),
  ('workout_10',         'Tien Tellen',         '10 workouts voltooid',                          'workouts', 'Dumbbell',      10,   'common',    11),
  ('workout_50',         'Vaste Klant',         '50 workouts voltooid',                          'workouts', 'Dumbbell',      50,   'rare',      12),
  ('workout_100',        'Centurion',           '100 workouts voltooid',                         'workouts', 'Dumbbell',      100,  'epic',      13),
  ('workout_250',        'Iron Discipline',     '250 workouts voltooid',                         'workouts', 'Dumbbell',      250,  'legendary', 14),
  -- Volume milestones (total kg lifted across all logged sets)
  ('volume_1k',          'Eerste Ton',          '1.000 kg getild totaal',                        'volume',   'Weight',        1000,    'common',    20),
  ('volume_10k',         'Heavy Hitter',        '10.000 kg getild totaal',                       'volume',   'Weight',        10000,   'common',    21),
  ('volume_50k',         'Tonnage Beast',       '50.000 kg getild totaal',                       'volume',   'Weight',        50000,   'rare',      22),
  ('volume_100k',        'Six-Figure Lifter',   '100.000 kg getild totaal',                      'volume',   'Weight',        100000,  'epic',      23),
  ('volume_500k',        'Half-Million Club',   '500.000 kg getild totaal',                      'volume',   'Weight',        500000,  'legendary', 24),
  -- Streaks (consecutive training days)
  ('streak_7',           'Week Warrior',        '7 dagen op rij getraind',                       'streak',   'Flame',         7,    'common',    30),
  ('streak_30',          'Maand Mentaliteit',   '30 dagen consistent getraind binnen 30 dagen',  'streak',   'Flame',         30,   'rare',      31),
  ('streak_12w',         'Quarter Beast',       '12 weken op rij minstens 1x getraind',          'streak',   'Flame',         12,   'epic',      32),
  -- Strength milestones (best e1RM in kg)
  ('bench_100',          'Plate Club',          'Bench press e1RM van 100 kg',                   'strength', 'Award',         100,  'common',    40),
  ('squat_150',          'Plate-and-a-Half',    'Back squat e1RM van 150 kg',                    'strength', 'Award',         150,  'rare',      41),
  ('deadlift_200',       'Two Plate Pull',      'Deadlift e1RM van 200 kg',                      'strength', 'Award',         200,  'rare',      42),
  ('bw_2x',              'Bodyweight x2',       'Big-3 totaal van 2x je lichaamsgewicht',        'strength', 'Award',         2,    'epic',      43),
  ('bw_3x',              'Bodyweight x3',       'Big-3 totaal van 3x je lichaamsgewicht',        'strength', 'Award',         3,    'legendary', 44),
  -- Social / referral (placeholder — activates once invite system exists)
  ('invite_intake',      'Recruiter',           'Iemand uitgenodigd die intake plant',           'social',   'UserPlus',      1,    'rare',      50),
  ('invite_purchase',    'Talent Scout',        'Iemand uitgenodigd die abonnement koopt',       'social',   'Trophy',        1,    'epic',      51);