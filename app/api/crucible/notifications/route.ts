import { z } from "zod";

import { requireSessionUser } from "@/app/api/crucible/_auth";

const PatchSchema = z.object({
  ids: z.union([z.array(z.string().uuid()), z.literal("all")]),
});

export async function GET(request: Request) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("read") === "false";

  let q = session.supabase
    .from("notifications")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (unreadOnly) q = q.is("read_at", null);

  const [{ data: notifications, error }, { count: unread }] = await Promise.all([
    q,
    session.supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .is("read_at", null),
  ]);

  if (error) {
    console.error("[GET notifications]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ notifications: notifications ?? [], unread_count: unread ?? 0 });
}

export async function PATCH(request: Request) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (parsed.data.ids === "all") {
    const { error } = await session.supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", session.user.id)
      .is("read_at", null);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await session.supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("user_id", session.user.id)
      .in("id", parsed.data.ids);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
