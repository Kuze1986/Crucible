import { requireSessionUser } from "@/app/api/crucible/_auth";

type Ctx = { params: Promise<{ orgId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { data: me } = await session.supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!me) return Response.json({ error: "Not a member" }, { status: 403 });

  const { data, error } = await session.supabase
    .from("org_members")
    .select("user_id, role, joined_at")
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ members: data ?? [] });
}
