/**
 * PostgREST schema for Crucible tables (`simulation_runs`, etc.).
 *
 * Must appear under Supabase → Settings → Data API → **Exposed schemas** (or legacy API → Exposed schemas).
 * If you see `Invalid schema: crucible`, either expose that schema or set `NEXT_PUBLIC_SUPABASE_SCHEMA` to where
 * your tables actually live (often `public`).
 */
function resolveDbSchema(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_SCHEMA?.trim();
  return raw && raw.length > 0 ? raw : "crucible";
}

export const CRUCIBLE_SCHEMA: string = resolveDbSchema();
