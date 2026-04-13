import { applyJobResultToRun } from "@/lib/crucible/apply-job-result";
import { getEffectiveOrchestratorConfig } from "@/lib/crucible/orchestrator-config";
import { runPostSimulationHooks } from "@/lib/crucible/post-complete";
import { getLatestJobForActor } from "@/lib/bioloop/client";
import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;
  const { id: runId } = await ctx.params;

  const { data: run, error: rErr } = await session.supabase
    .from("simulation_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", session.user.id)
    .single();

  if (rErr || !run) return Response.json({ error: "Not found" }, { status: 404 });

  if (run.status !== "queued" && run.status !== "running") {
    return Response.json({ ok: true, skipped: true, reason: "terminal_status" });
  }

  const orch = await getEffectiveOrchestratorConfig(session.supabase, session.user.id);
  if (!orch) {
    return Response.json({ error: "Orchestrator not configured" }, { status: 400 });
  }

  let latest: Awaited<ReturnType<typeof getLatestJobForActor>>;
  try {
    latest = await getLatestJobForActor(orch.baseUrl, orch.apiKey, runId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "poll failed";
    console.error("[sync] orchestrator", runId, e);
    return Response.json({ error: msg }, { status: 502 });
  }

  const st = (latest.status ?? "").toLowerCase();
  const done =
    st === "completed" ||
    st === "succeeded" ||
    st === "success" ||
    st === "failed" ||
    st === "error";

  if (!done) {
    return Response.json({ ok: true, applied: false, orchestrator_status: latest.status });
  }

  const service = createServiceSupabaseCrucible();
  const result = await applyJobResultToRun(service, {
    runId,
    payload: latest,
    requireStepsForComplete: st !== "failed" && st !== "error",
  });

  if (result.applied) {
    await runPostSimulationHooks(runId);
  }

  return Response.json({ ok: true, applied: result.applied, reason: result.reason });
}
