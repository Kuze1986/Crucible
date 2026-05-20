import { z } from "zod";

import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ orgId: string; memberId: string }> };

const PatchMemberSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export async function PATCH(request: Request, ctx: Ctx) {
  const { orgId, memberId } = await ctx.params;
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { data: me } = await session.supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchMemberSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const svc = createServiceSupabaseCrucible();
  const { data: target } = await svc
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", memberId)
    .maybeSingle();

  if (!target) return Response.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "owner") return Response.json({ error: "Cannot change owner role" }, { status: 400 });

  const { error } = await svc
    .from("org_members")
    .update({ role: parsed.data.role })
    .eq("org_id", orgId)
    .eq("user_id", memberId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { orgId, memberId } = await ctx.params;
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { data: me } = await session.supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  const isSelf = session.user.id === memberId;
  const isAdminOrOwner = me?.role === "owner" || me?.role === "admin";

  if (!isSelf && !isAdminOrOwner) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const svc = createServiceSupabaseCrucible();

  const { data: target } = await svc
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", memberId)
    .maybeSingle();

  if (!target) return Response.json({ error: "Member not found" }, { status: 404 });
  if (target.role === "owner") return Response.json({ error: "Cannot remove org owner" }, { status: 400 });

  const { error } = await svc
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", memberId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return new Response(null, { status: 204 });
}
