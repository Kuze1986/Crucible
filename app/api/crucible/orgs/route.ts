import { z } from "zod";

import { requireSessionUser } from "@/app/api/crucible/_auth";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, or hyphens"),
});

export async function GET() {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { data, error } = await session.supabase
    .from("org_members")
    .select("role, organizations(*)")
    .eq("user_id", session.user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const orgs = (data ?? []).map((row) => ({
    ...(row.organizations as Record<string, unknown>),
    role: row.role,
  }));

  return Response.json({ orgs });
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

  const parsed = CreateOrgSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const svc = createServiceSupabaseCrucible();

  const { data: existing } = await svc
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();

  if (existing) {
    return Response.json({ error: "Slug already taken" }, { status: 409 });
  }

  const { data: org, error: orgErr } = await svc
    .from("organizations")
    .insert({ name: parsed.data.name, slug: parsed.data.slug, owner_id: session.user.id })
    .select("*")
    .single();

  if (orgErr || !org) {
    return Response.json({ error: orgErr?.message ?? "Failed to create org" }, { status: 500 });
  }

  const { error: memberErr } = await svc
    .from("org_members")
    .insert({ org_id: (org as { id: string }).id, user_id: session.user.id, role: "owner" });

  if (memberErr) {
    console.error("[POST orgs] add owner member", memberErr);
  }

  return Response.json({ org }, { status: 201 });
}
