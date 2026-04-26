-- 1. Add reward column to achievements catalog
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS reward text;

-- 2. Remove old single-step invite achievements (no longer used)
DELETE FROM public.user_achievements WHERE achievement_key IN ('invite_intake', 'invite_purchase');
DELETE FROM public.achievements WHERE key IN ('invite_intake', 'invite_purchase');

-- 3. Insert the 4 new tier-based invite achievements
INSERT INTO public.achievements (key, name, description, category, icon, threshold, rarity, position, reward)
VALUES
  ('invite_bronze',   'Bronze Recruiter', '1 vriend met intake aanvraag',           'social', 'UserPlus',     1, 'common',    50, 'Shoutout op Instagram'),
  ('invite_silver',   'Silver Connector', '3 vrienden met intake aanvraag',         'social', 'Users',        3, 'rare',      51, 'Gratis bootcamp sessie'),
  ('invite_gold',     'Gold Scout',       '1 vriend die een pakket koopt',          'social', 'Trophy',       1, 'epic',      52, 'Gratis 1-op-1 PT sessie'),
  ('invite_platinum', 'Platinum Mogul',   '5 vrienden die een pakket kopen',        'social', 'Crown',        5, 'legendary', 53, 'Guts &amp; Gains merch pack + 3 PT sessies')
ON CONFLICT (key) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  threshold   = EXCLUDED.threshold,
  rarity      = EXCLUDED.rarity,
  position    = EXCLUDED.position,
  reward      = EXCLUDED.reward;