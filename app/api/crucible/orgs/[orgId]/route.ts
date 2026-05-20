import { z } from "zod";

import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ orgId: string }> };

const PatchOrgSchema = z.object({
  name: z.string().min(1).max(80).optional(),
});

async function requireOrgMember(
  session: Awaited<ReturnType<typeof requireSessionUser>>,
  orgId: string,
  minRole?: "admin" | "owner"
) {
  if ("error" in session) return null;
  const { data } = await session.supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (!data) return null;
  if (minRole === "owner" && data.role !== "owner") return null;
  if (minRole === "admin" && data.role !== "owner" && data.role !== "admin") return null;
  return data.role as string;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const role = await requireOrgMember(session, orgId);
  if (!role) return Response.json({ error: "Not a member" }, { status: 403 });

  const { data, error } = await session.supabase
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();

  if (error || !data) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({ org: { ...data, role } });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const role = await requireOrgMember(session, orgId, "admin");
  if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchOrgSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const svc = createServiceSupabaseCrucible();
  const { data, error } = await svc
    .from("organizations")
    .update(parsed.data)
    .eq("id", orgId)
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ org: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const role = await requireOrgMember(session, orgId, "owner");
  if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });

  const svc = createServiceSupabaseCrucible();
  const { error } = await svc.from("organizations").delete().eq("id", orgId);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return new Response(null, { status: 204 });
}
