-- Supporting indexes for server-side library pagination and score-range filtering
CREATE INDEX IF NOT EXISTS idx_runs_user_scores
  ON crucible.simulation_runs(user_id, overall_conflict_score, goal_completion_score);

CREATE INDEX IF NOT EXISTS idx_runs_user_profile
  ON crucible.simulation_runs(user_id, simulation_profile);
