CREATE TABLE crucible.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'run_complete',
  run_id UUID REFERENCES crucible.simulation_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  CONSTRAINT notifications_type_check CHECK (type IN ('run_complete', 'run_failed', 'system'))
);

ALTER TABLE crucible.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_own ON crucible.notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_unread
  ON crucible.notifications(user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_user_created
  ON crucible.notifications(user_id, created_at DESC);
