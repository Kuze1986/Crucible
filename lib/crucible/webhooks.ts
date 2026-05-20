import { createHmac } from "node:crypto";

import { createServiceSupabaseCrucible } from "@/lib/supabase/server";
import type { SimulationRunRow } from "@/lib/crucible/types";

export function buildWebhookPayload(run: SimulationRunRow, reportUrl: string): string {
  return JSON.stringify({
    event: "simulation.complete",
    run_id: run.id,
    title: run.title,
    status: run.status,
    overall_conflict_score: run.overall_conflict_score,
    goal_completion_score: run.goal_completion_score,
    experience_score: run.experience_score,
    trust_trajectory: run.trust_trajectory,
    report_url: reportUrl,
    completed_at: run.completed_at,
  });
}

export function signWebhookPayload(payload: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

export async function deliverWebhook(runId: string, userId: string): Promise<void> {
  const crucible = createServiceSupabaseCrucible();

  const { data: settings } = await crucible
    .from("user_settings")
    .select("webhook_url, webhook_secret")
    .eq("user_id", userId)
    .maybeSingle();

  const s = settings as {
    webhook_url?: string | null;
    webhook_secret?: string | null;
  } | null;

  if (!s?.webhook_url) return;

  const { data: run } = await crucible
    .from("simulation_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (!run) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const reportUrl = `${appUrl}/report?id=${runId}`;
  const payload = buildWebhookPayload(run as SimulationRunRow, reportUrl);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Crucible-Event": "simulation.complete",
  };
  if (s.webhook_secret) {
    headers["X-Crucible-Signature"] = signWebhookPayload(payload, s.webhook_secret);
  }

  try {
    const res = await fetch(s.webhook_url, { method: "POST", headers, body: payload });
    if (!res.ok) {
      console.warn(`[webhook] delivery failed: ${res.status} for run ${runId}`);
    }
  } catch (e) {
    console.error("[webhook] delivery error for run", runId, e);
  }
}
