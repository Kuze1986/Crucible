-- Organizations
CREATE TABLE IF NOT EXISTS crucible.organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT organizations_slug_unique UNIQUE (slug)
);

-- Membership
CREATE TABLE IF NOT EXISTS crucible.org_members (
  org_id      UUID NOT NULL REFERENCES crucible.organizations(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id),
  CONSTRAINT org_members_role_check CHECK (role IN ('owner', 'admin', 'member'))
);

-- Invites
CREATE TABLE IF NOT EXISTS crucible.org_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id       UUID NOT NULL REFERENCES crucible.organizations(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'member',
  token        UUID NOT NULL DEFAULT gen_random_uuid(),
  accepted_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '7 days',
  CONSTRAINT org_invites_token_unique UNIQUE (token),
  CONSTRAINT org_invites_role_check CHECK (role IN ('admin', 'member'))
);

-- Add org_id FK to simulation_runs and simulation_profiles
ALTER TABLE crucible.simulation_runs
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES crucible.organizations(id) ON DELETE SET NULL;

ALTER TABLE crucible.simulation_profiles
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES crucible.organizations(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user ON crucible.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON crucible.org_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON crucible.org_invites(email);
CREATE INDEX IF NOT EXISTS idx_runs_org ON crucible.simulation_runs(org_id) WHERE org_id IS NOT NULL;

-- RLS
ALTER TABLE crucible.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crucible.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crucible.org_invites ENABLE ROW LEVEL SECURITY;

-- Organizations: visible to members
CREATE POLICY orgs_member_select ON crucible.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crucible.org_members m
      WHERE m.org_id = id AND m.user_id = auth.uid()
    )
  );

-- Organizations: owner can update/delete
CREATE POLICY orgs_owner_update ON crucible.organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY orgs_owner_delete ON crucible.organizations
  FOR DELETE USING (owner_id = auth.uid());

-- Organizations: any auth user can create
CREATE POLICY orgs_insert ON crucible.organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Members: visible to org members
CREATE POLICY members_select ON crucible.org_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crucible.org_members m2
      WHERE m2.org_id = org_id AND m2.user_id = auth.uid()
    )
  );

-- Members: admins/owners can insert (invite acceptance handled by service role)
CREATE POLICY members_admin_insert ON crucible.org_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM crucible.org_members m2
      WHERE m2.org_id = org_id AND m2.user_id = auth.uid() AND m2.role IN ('owner', 'admin')
    )
  );

-- Members: admins/owners can update roles; owners can remove any member
CREATE POLICY members_admin_update ON crucible.org_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM crucible.org_members m2
      WHERE m2.org_id = org_id AND m2.user_id = auth.uid() AND m2.role IN ('owner', 'admin')
    )
  );

CREATE POLICY members_admin_delete ON crucible.org_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM crucible.org_members m2
      WHERE m2.org_id = org_id AND m2.user_id = auth.uid() AND m2.role IN ('owner', 'admin')
    )
  );

-- Invites: admins/owners can manage; public token lookup uses service role
CREATE POLICY invites_admin_all ON crucible.org_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crucible.org_members m
      WHERE m.org_id = org_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
    )
  );

-- simulation_runs: extend policy to allow org members to read org runs
-- Drop and recreate the existing own-runs select policy
DROP POLICY IF EXISTS runs_all_own ON crucible.simulation_runs;

CREATE POLICY runs_select ON crucible.simulation_runs
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      org_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM crucible.org_members m
        WHERE m.org_id = simulation_runs.org_id AND m.user_id = auth.uid()
      )
    )
  );

-- Preserve write policies (insert/update/delete) for own runs only
CREATE POLICY runs_insert_own ON crucible.simulation_runs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY runs_update_own ON crucible.simulation_runs
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY runs_delete_own ON crucible.simulation_runs
  FOR DELETE USING (user_id = auth.uid());
