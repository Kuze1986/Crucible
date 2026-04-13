import { applyJobResultToRun } from "@/lib/crucible/apply-job-result";
import { runPostSimulationHooks } from "@/lib/crucible/post-complete";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const key = request.headers.get("x-bioloop-key");
  if (!key || key !== process.env.BIOLOOP_SERVICE_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const runId =
    (typeof root.actor_id === "string" && root.actor_id) ||
    (typeof root.run_id === "string" && root.run_id) ||
    (typeof root.simulation_run_id === "string" && root.simulation_run_id);

  if (!runId) {
    return Response.json({ error: "Missing actor_id / run_id" }, { status: 400 });
  }

  const supabase = createServiceSupabaseCrucible();
  const { data: run } = await supabase.from("simulation_runs").select("id").eq("id", runId).single();
  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  const result = await applyJobResultToRun(supabase, {
    runId,
    payload: body,
    requireStepsForComplete: true,
  });

  if (!result.applied) {
    console.warn("[callback] not applied", runId, result.reason);
    return Response.json({ ok: true, applied: false, reason: result.reason });
  }

  await runPostSimulationHooks(runId);
  return Response.json({ ok: true });
}
