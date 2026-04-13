import { z } from "zod";

import { requireSessionUser } from "@/app/api/crucible/_auth";

const PatchSettingsSchema = z.object({
  orchestrator_url: z.union([z.string().url(), z.null()]).optional(),
  orchestrator_api_key: z.union([z.string().min(1), z.null()]).optional(),
  demoforge_base_url: z.union([z.string().url(), z.null()]).optional(),
  demoforge_export_enabled: z.boolean().optional(),
  notify_email_on_complete: z.boolean().optional(),
  display_name: z.string().optional().nullable(),
});

export async function GET() {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  const { data, error } = await session.supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.error("[GET settings]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const masked = data
    ? {
        ...data,
        orchestrator_api_key: maskSecret(data.orchestrator_api_key as string | null),
      }
    : null;

  return Response.json({ settings: masked });
}

function maskSecret(s: string | null) {
  if (!s) return null;
  if (s.length <= 4) return "****";
  return `••••••••${s.slice(-4)}`;
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

  const parsed = PatchSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: existing } = await session.supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  const base = (existing ?? {}) as Record<string, unknown>;
  const incoming = parsed.data as Record<string, unknown>;
  const row: Record<string, unknown> = {
    user_id: session.user.id,
    ...base,
    ...incoming,
    updated_at: new Date().toISOString(),
  };
  if (!("orchestrator_api_key" in incoming)) {
    delete row.orchestrator_api_key;
  }

  const { data, error } = await session.supabase
    .from("user_settings")
    .upsert(row, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    console.error("[PATCH settings]", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    settings: {
      ...data,
      orchestrator_api_key: maskSecret(data.orchestrator_api_key as string | null),
    },
  });
}
