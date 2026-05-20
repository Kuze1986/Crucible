import { z } from "zod";

import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";
import { createServiceSupabaseAdmin } from "@/lib/supabase/admin";
import { sendOrgInviteEmail } from "@/lib/integrations/resend";

type Ctx = { params: Promise<{ orgId: string }> };

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

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

  if (!me || (me.role !== "owner" && me.role !== "admin")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await session.supabase
    .from("org_invites")
    .select("id,email,role,token,created_at,accepted_at,expires_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ invites: data ?? [] });
}

export async function POST(request: Request, ctx: Ctx) {
  const { orgId } = await ctx.params;
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

  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const svc = createServiceSupabaseCrucible();

  const { data: org } = await svc
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  if (!org) return Response.json({ error: "Org not found" }, { status: 404 });

  const { data: invite, error: inviteErr } = await svc
    .from("org_invites")
    .insert({ org_id: orgId, email: parsed.data.email, role: parsed.data.role })
    .select("*")
    .single();

  if (inviteErr || !invite) {
    return Response.json({ error: inviteErr?.message ?? "Failed to create invite" }, { status: 500 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const acceptUrl = `${appUrl}/invites/${(invite as { token: string }).token}`;

  void (async () => {
    try {
      const admin = createServiceSupabaseAdmin();
      const { data: inviter } = await admin.auth.admin.getUserById(session.user.id);
      await sendOrgInviteEmail({
        to: parsed.data.email,
        orgName: (org as { name: string }).name,
        inviterEmail: inviter.user?.email ?? "a teammate",
        role: parsed.data.role,
        acceptUrl,
      });
    } catch (e) {
      console.error("[POST invites] email", e);
    }
  })();

  return Response.json({ invite }, { status: 201 });
}
