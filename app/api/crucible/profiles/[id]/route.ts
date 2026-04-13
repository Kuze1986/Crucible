import { z } from "zod";

import { mergeEngineWeights } from "@/lib/crucible/constants";
import { requireSessionUser } from "@/app/api/crucible/_auth";

const PatchProfileSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  engine_weights: z.record(z.string(), z.number()).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;
  const { id } = await ctx.params;

  const { data: existing } = await session.supabase
    .from("simulation_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing || existing.is_system_profile || existing.user_id !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.engine_weights) {
    patch.engine_weights = mergeEngineWeights(
      (existing.engine_weights as Record<string, number>) ?? {},
      parsed.data.engine_weights
    );
  }

  const { data, error } = await session.supabase
    .from("simulation_profiles")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[PATCH profile]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ profile: data });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;
  const { id } = await ctx.params;

  const { data: existing } = await session.supabase
    .from("simulation_profiles")
    .select("id,is_system_profile,user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.is_system_profile || existing.user_id !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await session.supabase.from("simulation_profiles").delete().eq("id", id);
  if (error) {
    console.error("[DELETE profile]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
