-- Drop the old function so we can change its signature
DROP FUNCTION IF EXISTS public.get_leaderboard();

-- Recreate with optional gender filter
CREATE OR REPLACE FUNCTION public.get_leaderboard(_gender text DEFAULT NULL)
RETURNS TABLE(
  rank_position integer,
  first_name text,
  current_tier rank_tier,
  current_division smallint,
  total_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    ROW_NUMBER() OVER (ORDER BY ur.total_score DESC, ur.updated_at ASC)::int AS rank_position,
    COALESCE(NULLIF(split_part(COALESCE(p.naam, ''), ' ', 1), ''), 'Atleet') AS first_name,
    ur.current_tier,
    ur.current_division,
    ur.total_score
  FROM public.user_ranks ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.total_score > 0
    AND (
      _gender IS NULL
      OR _gender = ''
      OR p.geslacht::text = _gender
    )
  ORDER BY ur.total_score DESC, ur.updated_at ASC
  LIMIT 20;
$function$;