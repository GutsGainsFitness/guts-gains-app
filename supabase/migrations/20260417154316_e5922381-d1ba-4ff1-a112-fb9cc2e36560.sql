-- Security definer function: returns top 20 ranked clients with minimal public info.
-- Only first name (split on first space) is exposed — no email, no last name, no user_id.
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  rank_position integer,
  first_name text,
  current_tier rank_tier,
  current_division smallint,
  total_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY ur.total_score DESC, ur.updated_at ASC)::int AS rank_position,
    COALESCE(NULLIF(split_part(COALESCE(p.naam, ''), ' ', 1), ''), 'Atleet') AS first_name,
    ur.current_tier,
    ur.current_division,
    ur.total_score
  FROM public.user_ranks ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id
  WHERE ur.total_score > 0
  ORDER BY ur.total_score DESC, ur.updated_at ASC
  LIMIT 20;
$$;

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard() FROM anon;