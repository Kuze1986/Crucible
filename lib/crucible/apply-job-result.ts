import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  RunStatus,
  SessionSummaryDoc,
  StoryboardStepRow,
  TrustTrajectory,
  UxFailurePointsDoc,
} from "@/lib/crucible/types";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function pickSteps(root: Record<string, unknown>): unknown[] {
  const direct =
    root.storyboard_steps ??
    root.steps ??
    root.storyboard ??
    (root.result as Record<string, unknown> | undefined)?.storyboard_steps ??
    (root.result as Record<string, unknown> | undefined)?.steps;
  if (Array.isArray(direct)) return direct;
  const result = root.result as Record<string, unknown> | undefined;
  if (result && Array.isArray(result.storyboard)) return result.storyboard;
  return [];
}

function pickRunScores(root: Record<string, unknown>): Record<string, unknown> {
  const result = root.result as Record<string, unknown> | undefined;
  const scores =
    (root.run_scores as Record<string, unknown>) ??
    (root.scores as Record<string, unknown>) ??
    (result?.run as Record<string, unknown>) ??
    (result?.scores as Record<string, unknown>) ??
    result ??
    root;
  return scores && typeof scores === "object" ? scores : {};
}

function normalizeStep(raw: unknown, index: number): Omit<StoryboardStepRow, "id" | "created_at"> {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const step_number = num(o.step_number ?? o.step ?? o.index) ?? index + 1;
  const action = str(o.action) ?? "explore";
  return {
    simulation_run_id: "",
    step_number,
    action,
    url: str(o.url ?? o.href),
    status: (str(o.status) as "ok" | "failed") ?? "ok",
    behavioral_reasoning: str(o.behavioral_reasoning ?? o.reasoning ?? o.reason),
    intent_alignment: num(o.intent_alignment ?? o.intent),
    conflict_score: num(o.conflict_score ?? o.conflict),
    conflict_type: str(o.conflict_type),
    emotional_signal: num(o.emotional_signal ?? o.emotional),
    trust_delta: num(o.trust_delta ?? o.trustDelta),
    experience_score: num(o.experience_score ?? o.experience),
  };
}

export type ApplyJobResultInput = {
  runId: string;
  payload: unknown;
  /** When false, do not flip status to completed if no steps (orchestrator still running). */
  requireStepsForComplete?: boolean;
};

export async function applyJobResultToRun(
  // Crucible-scoped and public-schema clients both expose `.from` for this flow.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, "public", any>,
  { runId, payload, requireStepsForComplete = true }: ApplyJobResultInput
): Promise<{ applied: boolean; reason?: string }> {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const statusRaw = str(root.status)?.toLowerCase() ?? "";
  const stepsRaw = pickSteps(root);
  const scores = pickRunScores(root);

  const terminalOrchestrator =
    statusRaw === "completed" ||
    statusRaw === "succeeded" ||
    statusRaw === "success" ||
    statusRaw === "failed" ||
    statusRaw === "error";

  if (!terminalOrchestrator && stepsRaw.length === 0) {
    return { applied: false, reason: "non_terminal_empty" };
  }

  if (requireStepsForComplete && stepsRaw.length === 0 && statusRaw !== "failed" && statusRaw !== "error") {
    return { applied: false, reason: "no_steps" };
  }

  const overall_conflict_score = num(scores.overall_conflict_score ?? scores.conflict_score);
  const goal_completion_score = num(scores.goal_completion_score ?? scores.goal_score);
  const experience_score = num(scores.experience_score);
  const trust_trajectory = str(scores.trust_trajectory) as TrustTrajectory | null;
  const runner_execution_id = str(scores.runner_execution_id ?? scores.execution_id);
  const duration_seconds = num(scores.duration_seconds ?? scores.duration);
  const artifact_video_url = str(scores.artifact_video_url ?? scores.video_url);
  const artifact_storyboard_url = str(scores.artifact_storyboard_url);
  const artifact_transcript_url = str(scores.artifact_transcript_url);
  const artifact_package_url = str(scores.artifact_package_url);

  let ux_failure_points: UxFailurePointsDoc | null = null;
  const ufp = scores.ux_failure_points ?? scores.uxFailurePoints;
  if (ufp && typeof ufp === "object") ux_failure_points = ufp as UxFailurePointsDoc;

  let session_summary: SessionSummaryDoc | null = null;
  const ss = scores.session_summary ?? scores.summary;
  if (ss && typeof ss === "object") session_summary = ss as SessionSummaryDoc;

  const failed = statusRaw === "failed" || statusRaw === "error";
  const nextStatus: RunStatus = failed ? "failed" : "completed";

  const { error: delErr } = await supabase.from("storyboard_steps").delete().eq("simulation_run_id", runId);
  if (delErr) {
    console.error("[applyJobResult] delete steps", runId, delErr);
    return { applied: false, reason: delErr.message };
  }

  if (stepsRaw.length > 0) {
    const rows = stepsRaw.map((s, i) => {
      const n = normalizeStep(s, i);
      return {
        simulation_run_id: runId,
        step_number: n.step_number,
        action: n.action,
        url: n.url,
        status: n.status,
        behavioral_reasoning: n.behavioral_reasoning,
        intent_alignment: n.intent_alignment,
        conflict_score: n.conflict_score,
        conflict_type: n.conflict_type,
        emotional_signal: n.emotional_signal,
        trust_delta: n.trust_delta,
        experience_score: n.experience_score,
      };
    });
    const { error: insErr } = await supabase.from("storyboard_steps").insert(rows);
    if (insErr) {
      console.error("[applyJobResult] insert steps", runId, insErr);
      return { applied: false, reason: insErr.message };
    }
  }

  const completed_at = new Date().toISOString();

  const { error: upErr } = await supabase
    .from("simulation_runs")
    .update({
      status: nextStatus,
      completed_at,
      duration_seconds,
      overall_conflict_score,
      goal_completion_score,
      experience_score,
      trust_trajectory,
      runner_execution_id,
      artifact_video_url,
      artifact_storyboard_url,
      artifact_transcript_url,
      artifact_package_url,
      ux_failure_points,
      session_summary,
      updated_at: completed_at,
    })
    .eq("id", runId);

  if (upErr) {
    console.error("[applyJobResult] update run", runId, upErr);
    return { applied: false, reason: upErr.message };
  }

  return { applied: true };
}
