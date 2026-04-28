ALTER TABLE crucible.simulation_runs
ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_crucible_runs_share_token
ON crucible.simulation_runs(share_token)
WHERE share_token IS NOT NULL;

DROP POLICY IF EXISTS "Public share token read" ON crucible.simulation_runs;
CREATE POLICY "Public share token read" ON crucible.simulation_runs
FOR SELECT
TO anon
USING (share_token IS NOT NULL);

DROP POLICY IF EXISTS "Public storyboard read via shared run" ON crucible.storyboard_steps;
CREATE POLICY "Public storyboard read via shared run" ON crucible.storyboard_steps
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM crucible.simulation_runs r
    WHERE r.id = simulation_run_id
      AND r.share_token IS NOT NULL
  )
);
