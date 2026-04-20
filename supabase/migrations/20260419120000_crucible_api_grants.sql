-- PostgREST / Supabase API roles must be able to use the crucible schema and objects.
-- RLS policies still control row-level access.
-- Run this if you see: "permission denied for schema crucible"

GRANT USAGE ON SCHEMA crucible TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA crucible TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA crucible TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crucible TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crucible TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA crucible
  GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crucible
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA crucible
  GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crucible
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
