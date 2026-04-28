CREATE TABLE IF NOT EXISTS crucible.evaluate_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  tenant_id TEXT,
  candidate_id TEXT,
  request_hash TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  latency_ms INTEGER,
  degraded BOOLEAN NOT NULL DEFAULT false,
  composite_score NUMERIC,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_evaluate_audit_logs_created_at
  ON crucible.evaluate_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evaluate_audit_logs_session_id
  ON crucible.evaluate_audit_logs (session_id, created_at DESC);
