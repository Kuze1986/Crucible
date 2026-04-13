import { z } from "zod";

import { mergeEngineWeights } from "@/lib/crucible/constants";
import { requireSessionUser } from "@/app/api/crucible/_auth";

const PostProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  engine_weights: z.record(z.string(), z.number()),
});

export async function GET() {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { data, error } = await session.supabase
    .from("simulation_profiles")
    .select("*")
    .order("is_system_profile", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("[GET profiles]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const system = rows.filter((p) => p.is_system_profile);
  const custom = rows.filter((p) => !p.is_system_profile);
  return Response.json({ profiles: rows, system, custom });
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

  const parsed = PostProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const engine_weights = mergeEngineWeights({}, parsed.data.engine_weights);

  const { data, error } = await session.supabase
    .from("simulation_profiles")
    .insert({
      user_id: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      profile_type: "custom",
      is_system_profile: false,
      engine_weights,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[POST profiles]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ profile: data });
}
