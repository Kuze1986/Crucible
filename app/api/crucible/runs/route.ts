import { z } from "zod";

import { DEFAULT_ENGINE_WEIGHTS, mergeEngineWeights } from "@/lib/crucible/constants";
import { getEffectiveOrchestratorConfig } from "@/lib/crucible/orchestrator-config";
import { createBehavioralSimulationJob } from "@/lib/bioloop/client";
import { requireSessionUser } from "@/app/api/crucible/_auth";

// ── GET schema ────────────────────────────────────────────────────────────────

const GetRunsSchema = z.object({
  status: z.enum(["queued", "running", "completed", "failed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(25),
  profile: z.string().optional(),
  sort: z.enum(["created", "conflict", "goal"]).default("created"),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  score_conflict_min: z.coerce.number().min(0).max(1).optional(),
  score_conflict_max: z.coerce.number().min(0).max(1).optional(),
  score_goal_min: z.coerce.number().min(0).max(1).optional(),
  score_goal_max: z.coerce.number().min(0).max(1).optional(),
  q: z.string().optional(),
  format: z.enum(["json", "csv"]).default("json"),
  org_id: z.string().uuid().optional(),
});

// ── POST schema ───────────────────────────────────────────────────────────────

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
  org_id: z.string().uuid().optional().nullable(),
});

// ── CSV helpers ───────────────────────────────────────────────────────────────

const CSV_COLS = [
  "id",
  "title",
  "target_url",
  "simulation_profile",
  "status",
  "overall_conflict_score",
  "goal_completion_score",
  "experience_score",
  "trust_trajectory",
  "created_at",
  "completed_at",
  "duration_seconds",
] as const;

function toCsv(rows: Record<string, unknown>[]): string {
  const header = CSV_COLS.join(",");
  const body = rows
    .map((r) =>
      CSV_COLS.map((c) => {
        const v = r[c] ?? "";
        const s = String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      }).join(",")
    )
    .join("\n");
  return header + "\n" + body;
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { searchParams } = new URL(request.url);
  const parsed = GetRunsSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const p = parsed.data;
  const isCsv = p.format === "csv";

  if (p.org_id) {
    const { data: membership } = await session.supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", p.org_id)
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (!membership) {
      return Response.json({ error: "Not a member of this org" }, { status: 403 });
    }
  }

  let q = session.supabase
    .from("simulation_runs")
    .select("*", { count: "exact" });

  if (p.org_id) {
    q = q.eq("org_id", p.org_id);
  } else {
    q = q.eq("user_id", session.user.id);
  }

  if (p.status) q = q.eq("status", p.status);
  if (p.profile) q = q.eq("simulation_profile", p.profile);
  if (p.q) q = q.ilike("title", `%${p.q}%`);
  if (p.date_from) q = q.gte("created_at", p.date_from);
  if (p.date_to) q = q.lte("created_at", `${p.date_to}T23:59:59.999Z`);
  if (p.score_conflict_min != null) q = q.gte("overall_conflict_score", p.score_conflict_min);
  if (p.score_conflict_max != null) q = q.lte("overall_conflict_score", p.score_conflict_max);
  if (p.score_goal_min != null) q = q.gte("goal_completion_score", p.score_goal_min);
  if (p.score_goal_max != null) q = q.lte("goal_completion_score", p.score_goal_max);

  const orderCol =
    p.sort === "conflict"
      ? "overall_conflict_score"
      : p.sort === "goal"
        ? "goal_completion_score"
        : "created_at";

  if (isCsv) {
    const { data, error } = await q
      .order(orderCol, { ascending: false, nullsFirst: false })
      .limit(10_000);
    if (error) {
      console.error("[GET runs csv]", error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    return new Response(toCsv((data ?? []) as Record<string, unknown>[]), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="crucible-runs.csv"',
      },
    });
  }

  const from = (p.page - 1) * p.page_size;
  const to = from + p.page_size - 1;

  const { data, error, count } = await q
    .order(orderCol, { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    console.error("[GET runs]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    runs: data ?? [],
    total: count ?? 0,
    page: p.page,
    page_size: p.page_size,
  });
}

// ── POST ──────────────────────────────────────────────────────────────────────

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
    org_id: p.org_id ?? null,
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
    return Response.json({
      run: updated ?? { ...run, orchestrator_run_id: job.job_id, status: "running" },
    });
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
