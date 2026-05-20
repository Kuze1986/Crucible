import { z } from "zod";

import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

const PatchRunSchema = z.object({
  status: z.enum(["failed"]).optional(),
  exported_to_demoforge: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;
  const { id } = await ctx.params;

  const { data: run, error: rErr } = await session.supabase
    .from("simulation_runs")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (rErr || !run) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { data: steps, error: sErr } = await session.supabase
    .from("storyboard_steps")
    .select("*")
    .eq("simulation_run_id", id)
    .order("step_number", { ascending: true });

  if (sErr) {
    console.error("[GET run] steps", sErr);
    return Response.json({ error: sErr.message }, { status: 500 });
  }

  return Response.json({ run, steps: steps ?? [] });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchRunSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await session.supabase
    .from("simulation_runs")
    .select("id,status,title")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.exported_to_demoforge !== undefined) {
    patch.exported_to_demoforge = parsed.data.exported_to_demoforge;
  }
  if (parsed.data.status === "failed") {
    if (existing.status === "queued" || existing.status === "running") {
      patch.status = "failed";
    }
  }

  const { data: run, error } = await session.supabase
    .from("simulation_runs")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[PATCH run]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (patch.status === "failed") {
    const crucible = createServiceSupabaseCrucible();
    void crucible
      .from("notifications")
      .insert({
        user_id: session.user.id,
        type: "run_failed",
        run_id: id,
        title: `Simulation cancelled: ${(existing as { title?: string } | null)?.title ?? id}`,
        body: "The run was cancelled manually.",
      })
      .then(({ error: nErr }) => {
        if (nErr) console.error("[PATCH run] notification", nErr);
      });
  }

  return Response.json({ run });
}
