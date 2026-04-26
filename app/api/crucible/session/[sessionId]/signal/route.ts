import { z } from "zod";

import { createServiceSupabaseCrucible } from "@/lib/supabase/server";
import type { BehaviorSignal, KuzeSessionState, TrustTrajectory } from "@/lib/crucible/types";

const SignalSchema = z.object({
  signal_type: z.string(),
  value: z.union([z.number(), z.string()]),
  timestamp: z.string(),
  source: z.enum(["hotspot", "branch_decision", "kuze_adaptation", "video_event"]),
});

const PostSessionSignalSchema = z.object({
  tenant_id: z.string().min(1),
  kuze_mode: z.string().min(1),
  journey_node_id: z.string().min(1),
  signals: z.array(SignalSchema),
});

type Ctx = { params: Promise<{ sessionId: string }> };

function deriveEngagementTrajectory(signals: BehaviorSignal[]): TrustTrajectory {
  const trustLike = signals
    .filter((s) => /trust(_delta)?/i.test(s.signal_type))
    .map((s) => (typeof s.value === "number" ? s.value : Number.NaN))
    .filter((n): n is number => Number.isFinite(n));

  if (trustLike.length === 0) return "stable";

  const avg = trustLike.reduce((a, n) => a + n, 0) / trustLike.length;
  if (avg > 0.1) return "rising";
  if (avg < -0.1) return "falling";
  return "stable";
}

export async function POST(request: Request, ctx: Ctx) {
  const key = request.headers.get("x-bioloop-key");
  if (!key || key !== process.env.BIOLOOP_SERVICE_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await ctx.params;
  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostSessionSignalSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { tenant_id, signals } = parsed.data;

  const engagement_trajectory = deriveEngagementTrajectory(signals);
  const friction_points = signals
    .filter((s) => s.source === "hotspot" || s.source === "branch_decision")
    .map((s) => s.signal_type);
  const recommended_pivot = null;
  const confidence = 0.5;
  const updated_at = new Date().toISOString();

  const state: KuzeSessionState = {
    session_id: sessionId,
    tenant_id,
    engagement_trajectory,
    friction_points,
    recommended_pivot,
    confidence,
    updated_at,
  };

  const supabase = createServiceSupabaseCrucible();

  const { error: upErr } = await supabase
    .from("demoforge_session_states")
    .upsert(
      {
        session_id: sessionId,
        tenant_id,
        engagement_trajectory,
        friction_points,
        recommended_pivot,
        confidence,
        updated_at,
      },
      { onConflict: "session_id" }
    );
  if (upErr) {
    console.error("[session signal] upsert", upErr);
    return Response.json({ error: upErr.message }, { status: 500 });
  }

  return Response.json({ state });
}
