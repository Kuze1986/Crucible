import type { BehaviorSignal, TrustTrajectory } from "@/lib/crucible/types";
import { randomUUID } from "node:crypto";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

type CloseDemoForgeSessionInput = {
  sessionId: string;
  tenantId: string;
  kuzeMode: string;
  journeyPath: string[];
  signalSummary: BehaviorSignal[];
  scores: {
    overall_conflict_score: number | null;
    goal_completion_score: number | null;
    experience_score: number | null;
    trust_trajectory: TrustTrajectory | null;
  };
};

/**
 * Terminal artifact writer: called once when a DemoForge session closes.
 */
export async function closeDemoForgeSession({
  sessionId,
  tenantId,
  kuzeMode,
  journeyPath,
  signalSummary,
  scores,
}: CloseDemoForgeSessionInput): Promise<string> {
  const supabase = createServiceSupabaseCrucible();
  const completedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from("simulation_runs")
    .insert({
      user_id: tenantId,
      title: `DemoForge Session ${sessionId}`,
      target_url: `demoforge://session/${sessionId}`,
      simulation_profile: "Engaged Prospect",
      status: "completed",
      completed_at: completedAt,
      overall_conflict_score: scores.overall_conflict_score,
      goal_completion_score: scores.goal_completion_score,
      experience_score: scores.experience_score,
      trust_trajectory: scores.trust_trajectory,
      exported_to_demoforge: true,
      share_token: randomUUID(),
      persona_context: {
        description: `Live DemoForge prospect session via Kuze ${kuzeMode}`,
      },
      updated_at: completedAt,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Failed to write DemoForge session artifact");
  }

  const goal = scores.goal_completion_score;
  const outcome =
    goal != null && goal >= 0.7
      ? "positive"
      : goal != null && goal < 0.4
        ? "negative"
        : "neutral";

  const engagement_delta =
    scores.trust_trajectory === "rising"
      ? "prospect engagement increased"
      : scores.trust_trajectory === "falling"
        ? "prospect engagement declined"
        : scores.trust_trajectory === "stable"
          ? "prospect engagement held steady"
          : scores.trust_trajectory === "volatile"
            ? "prospect engagement was inconsistent"
            : "unknown";

  const { error: updateErr } = await supabase
    .from("kuze_adaptation_log")
    .update({
      outcome_delta: {
        outcome,
        engagement_delta,
        goal_completion_score: scores.goal_completion_score,
        trust_trajectory: scores.trust_trajectory,
        evaluated_at: new Date().toISOString(),
      },
    })
    .eq("session_id", sessionId);
  if (updateErr) {
    throw new Error(updateErr.message);
  }

  // Intentionally accepted but not persisted yet; kept for forward-compatible telemetry extensions.
  void journeyPath;
  void signalSummary;

  return data.id as string;
}
