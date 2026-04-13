export type RunStatus = "queued" | "running" | "completed" | "failed";

export type TrustTrajectory = "rising" | "falling" | "stable" | "volatile";

export type StoryboardAction = "navigate" | "click" | "type" | "explore" | "assert";

export type StepStatus = "ok" | "failed";

export const ENGINE_WEIGHT_KEYS = [
  "intent",
  "trajectory",
  "conflict_threshold",
  "emotional",
  "trust",
  "defense",
  "safety",
  "curiosity",
] as const;

export type EngineWeightKey = (typeof ENGINE_WEIGHT_KEYS)[number];

export type EngineWeights = Partial<Record<EngineWeightKey, number>>;

export type PersonaContext = {
  description?: string;
};

export type RunConstraints = {
  blocked_actions?: string[];
  forbidden_zones?: string[];
};

export type UxFailurePoint = {
  step: number;
  type: string;
  score: number;
  url?: string;
  reasoning?: string;
};

export type UxFailurePointsDoc = {
  points: UxFailurePoint[];
};

export type SessionSummaryDoc = {
  recommendation?: string;
  trust_trajectory_detail?: string;
  goal_achieved?: boolean;
  key_strengths?: string[];
  key_weaknesses?: string[];
};

export type SimulationProfileRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  name: string;
  description: string | null;
  profile_type: string;
  is_system_profile: boolean;
  engine_weights: EngineWeights;
};

export type SimulationRunRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  target_url: string;
  simulation_profile: string;
  engine_weights: EngineWeights | null;
  goal: string | null;
  persona_context: PersonaContext | null;
  constraints: RunConstraints | null;
  status: RunStatus;
  orchestrator_run_id: string | null;
  runner_execution_id: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  overall_conflict_score: number | null;
  goal_completion_score: number | null;
  experience_score: number | null;
  trust_trajectory: TrustTrajectory | null;
  artifact_video_url: string | null;
  artifact_storyboard_url: string | null;
  artifact_transcript_url: string | null;
  artifact_package_url: string | null;
  ux_failure_points: UxFailurePointsDoc | null;
  session_summary: SessionSummaryDoc | null;
  exported_to_demoforge: boolean;
};

export type StoryboardStepRow = {
  id: string;
  created_at: string;
  simulation_run_id: string;
  step_number: number;
  action: StoryboardAction | string;
  url: string | null;
  status: StepStatus;
  behavioral_reasoning: string | null;
  intent_alignment: number | null;
  conflict_score: number | null;
  conflict_type: string | null;
  emotional_signal: number | null;
  trust_delta: number | null;
  experience_score: number | null;
};

export type UserSettingsRow = {
  user_id: string;
  created_at: string;
  updated_at: string;
  orchestrator_url: string | null;
  orchestrator_api_key: string | null;
  demoforge_base_url: string | null;
  demoforge_export_enabled: boolean;
  notify_email_on_complete: boolean;
  display_name: string | null;
};
