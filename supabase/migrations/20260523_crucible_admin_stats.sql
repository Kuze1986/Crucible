CREATE OR REPLACE FUNCTION crucible.admin_top_users_by_run_count(limit_n integer DEFAULT 10)
RETURNS TABLE(user_id uuid, run_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT user_id, COUNT(*) AS run_count
  FROM crucible.simulation_runs
  GROUP BY user_id
  ORDER BY run_count DESC
  LIMIT limit_n;
$$;
