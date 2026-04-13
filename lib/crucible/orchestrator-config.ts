import type { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function getEffectiveOrchestratorConfig(
  supabase: ServerClient,
  userId: string
): Promise<{ baseUrl: string; apiKey: string } | null> {
  const envUrl = (process.env.BIOLOOP_ORCHESTRATOR_URL ?? "").replace(/\/$/, "");
  const envKey = process.env.BIOLOOP_SERVICE_KEY ?? "";

  const { data } = await supabase
    .from("user_settings")
    .select("orchestrator_url, orchestrator_api_key")
    .eq("user_id", userId)
    .maybeSingle();

  const row = data as
    | { orchestrator_url: string | null; orchestrator_api_key: string | null }
    | null;

  const baseUrl = (row?.orchestrator_url?.trim() || envUrl).replace(/\/$/, "");
  const apiKey = row?.orchestrator_api_key?.trim() || envKey;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

export function getEnvOrchestratorConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = (process.env.BIOLOOP_ORCHESTRATOR_URL ?? "").replace(/\/$/, "");
  const apiKey = process.env.BIOLOOP_SERVICE_KEY ?? "";
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}
