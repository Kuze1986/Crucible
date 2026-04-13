import { enrichSessionSummaryWithAnthropic } from "@/lib/integrations/anthropic";
import { sendSimulationCompleteEmail } from "@/lib/integrations/resend";
import { createServiceSupabaseAdmin } from "@/lib/supabase/admin";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

import type { SessionSummaryDoc } from "@/lib/crucible/types";

export async function runPostSimulationHooks(runId: string) {
  const crucible = createServiceSupabaseCrucible();
  const { data: run, error } = await crucible.from("simulation_runs").select("*").eq("id", runId).single();
  if (error || !run) {
    console.error("[postComplete] load run", runId, error);
    return;
  }

  const row = run as {
    id: string;
    user_id: string;
    title: string;
    target_url: string;
    status: string;
    session_summary: SessionSummaryDoc | null;
  };

  if (row.status !== "completed") return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const reportUrl = appUrl ? `${appUrl}/report?id=${row.id}` : `/report?id=${row.id}`;

  let summary = row.session_summary;
  const { count } = await crucible
    .from("storyboard_steps")
    .select("id", { count: "exact", head: true })
    .eq("simulation_run_id", runId);

  const enriched = await enrichSessionSummaryWithAnthropic({
    runTitle: row.title,
    targetUrl: row.target_url,
    existing: summary,
    stepCount: count ?? 0,
  });
  if (enriched) {
    summary = enriched;
    await crucible.from("simulation_runs").update({ session_summary: enriched }).eq("id", runId);
  }

  const { data: settings } = await crucible
    .from("user_settings")
    .select("notify_email_on_complete")
    .eq("user_id", row.user_id)
    .maybeSingle();

  const notify =
    (settings as { notify_email_on_complete?: boolean } | null)?.notify_email_on_complete === true;

  if (!notify) return;

  try {
    const admin = createServiceSupabaseAdmin();
    const { data: userRes, error: uErr } = await admin.auth.admin.getUserById(row.user_id);
    if (uErr || !userRes.user?.email) {
      console.error("[postComplete] user email", uErr);
      return;
    }
    await sendSimulationCompleteEmail({
      to: userRes.user.email,
      runTitle: row.title,
      reportUrl,
    });
  } catch (e) {
    console.error("[postComplete] email", e);
  }
}
