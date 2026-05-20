import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const svc = createServiceSupabaseCrucible();

  const { data: invite, error } = await svc
    .from("org_invites")
    .select("id,email,role,org_id,accepted_at,expires_at,organizations(name,slug)")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return Response.json({ error: "Invite not found" }, { status: 404 });

  const inv = invite as typeof invite & { accepted_at: string | null; expires_at: string };
  if (inv.accepted_at) return Response.json({ error: "Already accepted" }, { status: 410 });
  if (new Date(inv.expires_at) < new Date()) return Response.json({ error: "Invite expired" }, { status: 410 });

  return Response.json({ invite });
}

export async function POST(_req: Request, ctx: Ctx) {
  const { token } = await ctx.params;
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const svc = createServiceSupabaseCrucible();

  const { data: invite, error } = await svc
    .from("org_invites")
    .select("id,email,role,org_id,accepted_at,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) return Response.json({ error: "Invite not found" }, { status: 404 });

  const inv = invite as typeof invite & {
    id: string;
    email: string;
    role: string;
    org_id: string;
    accepted_at: string | null;
    expires_at: string;
  };
  if (inv.accepted_at) return Response.json({ error: "Already accepted" }, { status: 410 });
  if (new Date(inv.expires_at) < new Date()) return Response.json({ error: "Invite expired" }, { status: 410 });
  if (session.user.email !== inv.email) {
    return Response.json({ error: "This invite was sent to a different email address" }, { status: 403 });
  }

  const { data: existing } = await svc
    .from("org_members")
    .select("user_id")
    .eq("org_id", inv.org_id)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberErr } = await svc
      .from("org_members")
      .insert({ org_id: inv.org_id, user_id: session.user.id, role: inv.role });

    if (memberErr) return Response.json({ error: memberErr.message }, { status: 500 });
  }

  await svc
    .from("org_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  return Response.json({ ok: true, org_id: inv.org_id });
}
