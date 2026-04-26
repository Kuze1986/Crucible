import { createServiceSupabaseCrucible } from "@/lib/supabase/server";
import type { KuzeSessionState } from "@/lib/crucible/types";

type Ctx = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const key = _request.headers.get("x-bioloop-key");
  if (!key || key !== process.env.BIOLOOP_SERVICE_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await ctx.params;
  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const supabase = createServiceSupabaseCrucible();
  const { data, error } = await supabase
    .from("demoforge_session_states")
    .select(
      "session_id,tenant_id,engagement_trajectory,friction_points,recommended_pivot,confidence,updated_at"
    )
    .eq("session_id", sessionId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[session state] get", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return Response.json({ error: "No session state found" }, { status: 404 });
  }

  const state: KuzeSessionState = {
    session_id: data.session_id as string,
    tenant_id: data.tenant_id as string,
    engagement_trajectory: data.engagement_trajectory as KuzeSessionState["engagement_trajectory"],
    friction_points: (data.friction_points as string[] | null) ?? [],
    recommended_pivot: (data.recommended_pivot as string | null) ?? null,
    confidence: Number(data.confidence ?? 0),
    updated_at: data.updated_at as string,
  };

  return Response.json(state);
}
