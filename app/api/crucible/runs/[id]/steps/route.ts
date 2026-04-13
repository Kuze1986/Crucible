import { requireSessionUser } from "@/app/api/crucible/_auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;
  const { id } = await ctx.params;

  const { data: run } = await session.supabase
    .from("simulation_runs")
    .select("id")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!run) return Response.json({ error: "Not found" }, { status: 404 });

  const { data: steps, error } = await session.supabase
    .from("storyboard_steps")
    .select("*")
    .eq("simulation_run_id", id)
    .order("step_number", { ascending: true });

  if (error) {
    console.error("[GET steps]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ steps: steps ?? [] });
}
