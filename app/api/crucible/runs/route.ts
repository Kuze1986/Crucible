import { z } from "zod";

import { DEFAULT_ENGINE_WEIGHTS, mergeEngineWeights } from "@/lib/crucible/constants";
import { getEffectiveOrchestratorConfig } from "@/lib/crucible/orchestrator-config";
import { createBehavioralSimulationJob } from "@/lib/bioloop/client";
import { requireSessionUser } from "@/app/api/crucible/_auth";

const PostRunSchema = z.object({
  title: z.string().min(1),
  target_url: z.string().url(),
  simulation_profile: z.string().min(1),
  engine_weights: z.record(z.string(), z.number()).optional().nullable(),
  goal: z.string().optional().nullable(),
  persona_context: z
    .object({ description: z.string().optional() })
    .optional()
    .nullable(),
  constraints: z
    .object({
      blocked_actions: z.array(z.string()).optional(),
      forbidden_zones: z.array(z.string()).optional(),
    })
    .optional()
    .nullable(),
});

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let q = session.supabase
    .from("simulation_runs")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (status && ["queued", "running", "completed", "failed"].includes(status)) {
    q = q.eq("status", status);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[GET runs]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ runs: data ?? [] });
}

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostRunSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;

  let baseWeights = DEFAULT_ENGINE_WEIGHTS;
  if (p.simulation_profile !== "custom") {
    const { data: prof } = await session.supabase
      .from("simulation_profiles")
      .select("engine_weights")
      .eq("name", p.simulation_profile)
      .eq("is_system_profile", true)
      .maybeSingle();
    const ew = (prof as { engine_weights?: Record<string, number> } | null)?.engine_weights;
    if (ew && typeof ew === "object") baseWeights = mergeEngineWeights(DEFAULT_ENGINE_WEIGHTS, ew);
  }
  const engine_weights = mergeEngineWeights(baseWeights, p.engine_weights);

  const insertRow = {
    user_id: session.user.id,
    title: p.title,
    target_url: p.target_url,
    simulation_profile: p.simulation_profile,
    engine_weights,
    goal: p.goal ?? null,
    persona_context: p.persona_context ?? null,
    constraints: p.constraints ?? null,
    status: "queued" as const,
  };

  const { data: run, error: insErr } = await session.supabase
    .from("simulation_runs")
    .insert(insertRow)
    .select("*")
    .single();

  if (insErr || !run) {
    console.error("[POST runs] insert", insErr);
    return Response.json({ error: insErr?.message ?? "Insert failed" }, { status: 500 });
  }

  const orch = await getEffectiveOrchestratorConfig(session.supabase, session.user.id);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!orch || !appUrl) {
    await session.supabase
      .from("simulation_runs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", run.id);
    return Response.json(
      {
        error:
          "Orchestrator not configured (set BIOLOOP_ORCHESTRATOR_URL, BIOLOOP_SERVICE_KEY, and NEXT_PUBLIC_APP_URL) or user overrides in Settings.",
        run,
      },
      { status: 502 }
    );
  }

  const goalText = p.goal?.trim() ?? "";

  try {
    const job = await createBehavioralSimulationJob(orch.baseUrl, orch.apiKey, {
      actor_id: run.id,
      product: "crucible",
      job_type: "behavioral_simulation",
      priority: 5,
      context: {
        target_url: p.target_url,
        simulation_profile: p.simulation_profile,
        engine_weights,
        goal: goalText,
        persona_context: p.persona_context ?? null,
        constraints: p.constraints ?? null,
      },
      callback_url: `${appUrl}/api/crucible/callback`,
    });

    const { data: updated, error: upErr } = await session.supabase
      .from("simulation_runs")
      .update({
        orchestrator_run_id: job.job_id,
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id)
      .select("*")
      .single();

    if (upErr) {
      console.error("[POST runs] update job id", upErr);
      return Response.json({ error: upErr.message, run }, { status: 500 });
    }
    return Response.json({ run: updated ?? { ...run, orchestrator_run_id: job.job_id, status: "running" } });
  } catch (e) {
    console.error("[POST runs] orchestrator", e);
    await session.supabase
      .from("simulation_runs")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", run.id);
    const msg = e instanceof Error ? e.message : "Orchestrator error";
    return Response.json({ error: msg, run }, { status: 502 });
  }
}
