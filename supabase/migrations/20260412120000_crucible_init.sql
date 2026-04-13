-- Crucible schema for nexus-core Supabase project
CREATE SCHEMA IF NOT EXISTS crucible;

-- User settings (orchestrator overrides, DemoForge, notifications)
CREATE TABLE crucible.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  orchestrator_url TEXT,
  orchestrator_api_key TEXT,
  demoforge_base_url TEXT,
  demoforge_export_enabled BOOLEAN NOT NULL DEFAULT false,
  notify_email_on_complete BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT
);

ALTER TABLE crucible.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_settings_select ON crucible.user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_settings_insert ON crucible.user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_settings_update ON crucible.user_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY user_settings_delete ON crucible.user_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Simulation profiles (nullable user_id for system-seeded rows)
CREATE TABLE crucible.simulation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  profile_type TEXT NOT NULL DEFAULT 'custom',
  is_system_profile BOOLEAN NOT NULL DEFAULT false,
  engine_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT simulation_profiles_system_user_check CHECK (
    (is_system_profile = true AND user_id IS NULL)
    OR (is_system_profile = false AND user_id IS NOT NULL)
  )
);

CREATE TABLE crucible.simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_url TEXT NOT NULL,
  simulation_profile TEXT NOT NULL,
  engine_weights JSONB,
  goal TEXT,
  persona_context JSONB,
  constraints JSONB,
  status TEXT NOT NULL DEFAULT 'queued',
  orchestrator_run_id TEXT,
  runner_execution_id TEXT,
  completed_at TIMESTAMPTZ,
  duration_seconds NUMERIC,
  overall_conflict_score NUMERIC,
  goal_completion_score NUMERIC,
  experience_score NUMERIC,
  trust_trajectory TEXT,
  artifact_video_url TEXT,
  artifact_storyboard_url TEXT,
  artifact_transcript_url TEXT,
  artifact_package_url TEXT,
  ux_failure_points JSONB,
  session_summary JSONB,
  exported_to_demoforge BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE crucible.storyboard_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  simulation_run_id UUID NOT NULL REFERENCES crucible.simulation_runs(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  action TEXT NOT NULL,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'ok',
  behavioral_reasoning TEXT,
  intent_alignment NUMERIC,
  conflict_score NUMERIC,
  conflict_type TEXT,
  emotional_signal NUMERIC,
  trust_delta NUMERIC,
  experience_score NUMERIC
);

ALTER TABLE crucible.simulation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE crucible.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crucible.storyboard_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON crucible.simulation_profiles
  FOR SELECT USING (
    (is_system_profile = true AND user_id IS NULL)
    OR (auth.uid() = user_id)
  );

CREATE POLICY profiles_insert ON crucible.simulation_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND is_system_profile = false
  );

CREATE POLICY profiles_update ON crucible.simulation_profiles
  FOR UPDATE USING (
    auth.uid() = user_id
    AND is_system_profile = false
  );

CREATE POLICY profiles_delete ON crucible.simulation_profiles
  FOR DELETE USING (
    auth.uid() = user_id
    AND is_system_profile = false
  );

CREATE POLICY runs_all_own ON crucible.simulation_runs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY steps_select_own ON crucible.storyboard_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crucible.simulation_runs r
      WHERE r.id = simulation_run_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY steps_insert_own ON crucible.storyboard_steps
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM crucible.simulation_runs r
      WHERE r.id = simulation_run_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY steps_update_own ON crucible.storyboard_steps
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM crucible.simulation_runs r
      WHERE r.id = simulation_run_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY steps_delete_own ON crucible.storyboard_steps
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM crucible.simulation_runs r
      WHERE r.id = simulation_run_id AND r.user_id = auth.uid()
    )
  );

CREATE INDEX idx_runs_user_status ON crucible.simulation_runs(user_id, status);
CREATE INDEX idx_runs_created ON crucible.simulation_runs(created_at DESC);
CREATE INDEX idx_steps_run ON crucible.storyboard_steps(simulation_run_id, step_number);

-- Service role bypasses RLS for seed
INSERT INTO crucible.simulation_profiles
  (user_id, name, description, profile_type, is_system_profile, engine_weights)
VALUES
  (NULL, 'Buyer Journey', 'Motivated prospect following the natural conversion path.', 'system', true,
   '{"intent":0.4,"trajectory":0.3,"trust":0.2,"conflict_threshold":0.65,"emotional":0.1}'::jsonb),
  (NULL, 'Skeptical Evaluator', 'Probes for missing features and unclear value props.', 'system', true,
   '{"defense":0.35,"intent":0.25,"conflict_threshold":0.45,"trust":0.15,"trajectory":0.25}'::jsonb),
  (NULL, 'Anxious First Timer', 'Abandons flows that are not immediately obvious.', 'system', true,
   '{"emotional":0.4,"trust":0.1,"safety":0.25,"conflict_threshold":0.4,"curiosity":0.25}'::jsonb),
  (NULL, 'Conflict Stress Test', 'Deliberately adversarial to surface edge cases and failures.', 'system', true,
   '{"conflict_threshold":0.3,"defense":0.5,"safety":0.2}'::jsonb),
  (NULL, 'Power User', 'Experienced user moving fast, exposing feature gaps.', 'system', true,
   '{"trajectory":0.45,"intent":0.35,"curiosity":0.2,"conflict_threshold":0.7,"trust":0.8}'::jsonb);
