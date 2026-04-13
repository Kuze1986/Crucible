import type { EngineWeights } from "@/lib/crucible/types";

export const SYSTEM_PROFILE_NAMES = [
  "Buyer Journey",
  "Skeptical Evaluator",
  "Anxious First Timer",
  "Conflict Stress Test",
  "Power User",
] as const;

export type SystemProfileName = (typeof SYSTEM_PROFILE_NAMES)[number];

export const DEFAULT_ENGINE_WEIGHTS: EngineWeights = {
  intent: 0.2,
  trajectory: 0.2,
  conflict_threshold: 0.5,
  emotional: 0.2,
  trust: 0.2,
  defense: 0.2,
  safety: 0.2,
  curiosity: 0.2,
};

export function isSystemProfileName(name: string): name is SystemProfileName {
  return (SYSTEM_PROFILE_NAMES as readonly string[]).includes(name);
}

export function mergeEngineWeights(base: EngineWeights, override?: EngineWeights | null) {
  return { ...DEFAULT_ENGINE_WEIGHTS, ...base, ...override } satisfies EngineWeights;
}
