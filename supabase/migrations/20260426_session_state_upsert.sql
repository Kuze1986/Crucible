ALTER TABLE crucible.demoforge_session_states
  DROP CONSTRAINT IF EXISTS demoforge_session_states_session_id_key;
ALTER TABLE crucible.demoforge_session_states
  ADD CONSTRAINT demoforge_session_states_session_id_key UNIQUE (session_id);
