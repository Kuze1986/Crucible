CREATE TABLE IF NOT EXISTS crucible.bioloop_output_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bioloop_output_events_session
  ON crucible.bioloop_output_events (session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crucible.reporting_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL,
  event_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready'
);

CREATE INDEX IF NOT EXISTS idx_reporting_outbox_status_created
  ON crucible.reporting_outbox (status, created_at DESC);
