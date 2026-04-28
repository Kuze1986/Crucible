import { z } from "zod";

const PersonaInputSchema = z.object({
  persona_id: z.string().min(1),
  prompt: z.string().min(1),
  response: z.string().min(1),
});

export const EvaluateRequestSchema = z.object({
  session_id: z.string().min(1),
  tenant_id: z.string().min(1),
  candidate_id: z.string().min(1),
  attempts: z.array(PersonaInputSchema).length(6),
});

export type EvaluateRequest = z.infer<typeof EvaluateRequestSchema>;
export type ChallengeType =
  | "objection_handling"
  | "trust_repair"
  | "navigation_friction"
  | "pricing_pushback"
  | "compliance_challenge"
  | "time_pressure";

export type PersonaEvaluation = {
  persona_id: string;
  persona_name: string;
  challenge_type: ChallengeType;
  voice_style: string;
  score: number;
  stress_triggered: boolean;
  notes: string;
  ok: boolean;
  error: string | null;
};

export type EvaluateResponse = {
  session_id: string;
  tenant_id: string;
  candidate_id: string;
  composite_score: number;
  latency_ms: number;
  personas: PersonaEvaluation[];
  rubric_version: string;
  audit: {
    request_hash: string;
    timestamp: string;
    degraded: boolean;
  };
};

const PersonaEvaluationSchema = z.object({
  persona_id: z.string(),
  persona_name: z.string(),
  challenge_type: z.enum([
    "objection_handling",
    "trust_repair",
    "navigation_friction",
    "pricing_pushback",
    "compliance_challenge",
    "time_pressure",
  ]),
  voice_style: z.string(),
  score: z.number().min(0).max(100),
  stress_triggered: z.boolean(),
  notes: z.string(),
  ok: z.boolean(),
  error: z.string().nullable(),
});

export const EvaluateResponseSchema = z.object({
  session_id: z.string(),
  tenant_id: z.string(),
  candidate_id: z.string(),
  composite_score: z.number().min(0).max(100),
  latency_ms: z.number().int().nonnegative(),
  personas: z.array(PersonaEvaluationSchema).length(6),
  rubric_version: z.literal("v1"),
  audit: z.object({
    request_hash: z.string().length(64),
    timestamp: z.string(),
    degraded: z.boolean(),
  }),
});

const PERSONAS: Array<{
  persona_id: string;
  persona_name: string;
  challenge_type: ChallengeType;
  voice_style: string;
  stress_keywords: string[];
}> = [
  {
    persona_id: "p-anxious-first-timer",
    persona_name: "Anxious First Timer",
    challenge_type: "trust_repair",
    voice_style: "hesitant and risk-sensitive",
    stress_keywords: ["confusing", "unsafe", "unclear", "anxious"],
  },
  {
    persona_id: "p-conflict-stress-test",
    persona_name: "Conflict Stress Test",
    challenge_type: "objection_handling",
    voice_style: "adversarial and skeptical",
    stress_keywords: ["pushback", "disagree", "no", "reject"],
  },
  {
    persona_id: "p-power-user",
    persona_name: "Power User",
    challenge_type: "navigation_friction",
    voice_style: "fast and precision-driven",
    stress_keywords: ["slow", "extra steps", "blocked", "friction"],
  },
  {
    persona_id: "p-budget-gatekeeper",
    persona_name: "Budget Gatekeeper",
    challenge_type: "pricing_pushback",
    voice_style: "cost-focused and pragmatic",
    stress_keywords: ["expensive", "cost", "budget", "roi"],
  },
  {
    persona_id: "p-compliance-officer",
    persona_name: "Compliance Officer",
    challenge_type: "compliance_challenge",
    voice_style: "policy-first and strict",
    stress_keywords: ["policy", "security", "compliance", "risk"],
  },
  {
    persona_id: "p-busy-exec",
    persona_name: "Busy Executive",
    challenge_type: "time_pressure",
    voice_style: "impatient and outcome-focused",
    stress_keywords: ["quick", "time", "now", "deadline"],
  },
];

function clamp0To100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function scoreSingleResponse(input: { prompt: string; response: string; challenge_type: ChallengeType }): number {
  const p = input.prompt.trim().toLowerCase();
  const r = input.response.trim().toLowerCase();
  const responseWords = r.split(/\s+/).filter(Boolean);

  const empathyBonus =
    r.includes("understand") || r.includes("thanks") || r.includes("help") || r.includes("clarify") ? 8 : 0;
  const actionBonus =
    r.includes("next step") || r.includes("here is") || r.includes("we can") || r.includes("let's") ? 10 : 0;
  const brevityPenalty = responseWords.length < 8 ? 12 : 0;
  const mismatchPenalty = p.includes("price") && !r.includes("price") && !r.includes("cost") ? 10 : 0;

  const challengeBonus =
    input.challenge_type === "compliance_challenge" && (r.includes("policy") || r.includes("security"))
      ? 10
      : input.challenge_type === "time_pressure" && (r.includes("quick") || r.includes("fast"))
        ? 8
        : input.challenge_type === "trust_repair" && (r.includes("safe") || r.includes("confidence"))
          ? 8
          : 0;

  return clamp0To100(55 + empathyBonus + actionBonus + challengeBonus - brevityPenalty - mismatchPenalty);
}

export async function runSixPersonaGauntlet(request: EvaluateRequest): Promise<PersonaEvaluation[]> {
  const results: PersonaEvaluation[] = [];

  for (const persona of PERSONAS) {
    const attempt = request.attempts.find((a) => a.persona_id === persona.persona_id);
    if (!attempt) {
      results.push({
        persona_id: persona.persona_id,
        persona_name: persona.persona_name,
        challenge_type: persona.challenge_type,
        voice_style: persona.voice_style,
        score: 0,
        stress_triggered: true,
        notes: "Missing persona attempt",
        ok: false,
        error: "missing_attempt",
      });
      continue;
    }

    try {
      const score = scoreSingleResponse({
        prompt: attempt.prompt,
        response: attempt.response,
        challenge_type: persona.challenge_type,
      });

      const responseLower = attempt.response.toLowerCase();
      const stress_triggered = persona.stress_keywords.some((keyword) => responseLower.includes(keyword));

      results.push({
        persona_id: persona.persona_id,
        persona_name: persona.persona_name,
        challenge_type: persona.challenge_type,
        voice_style: persona.voice_style,
        score,
        stress_triggered,
        notes: score >= 70 ? "Strong handling" : score >= 50 ? "Moderate handling" : "Weak handling",
        ok: true,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "persona_evaluation_failed";
      results.push({
        persona_id: persona.persona_id,
        persona_name: persona.persona_name,
        challenge_type: persona.challenge_type,
        voice_style: persona.voice_style,
        score: 0,
        stress_triggered: false,
        notes: "Persona evaluation degraded",
        ok: false,
        error: message,
      });
    }
  }

  return results;
}

export function evaluatePayload(input: EvaluateRequest): EvaluateResponse {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();
  const request_hash = "0".repeat(64);

  // Kept synchronous for deterministic test use while route uses async wrapper.
  const personas = PERSONAS.map((persona) => {
    const attempt = input.attempts.find((a) => a.persona_id === persona.persona_id);
    if (!attempt) {
      return {
        persona_id: persona.persona_id,
        persona_name: persona.persona_name,
        challenge_type: persona.challenge_type,
        voice_style: persona.voice_style,
        score: 0,
        stress_triggered: true,
        notes: "Missing persona attempt",
        ok: false,
        error: "missing_attempt",
      };
    }

    const score = scoreSingleResponse({
      prompt: attempt.prompt,
      response: attempt.response,
      challenge_type: persona.challenge_type,
    });
    const responseLower = attempt.response.toLowerCase();
    const stress_triggered = persona.stress_keywords.some((keyword) => responseLower.includes(keyword));
    return {
      persona_id: persona.persona_id,
      persona_name: persona.persona_name,
      challenge_type: persona.challenge_type,
      voice_style: persona.voice_style,
      score,
      stress_triggered,
      notes: score >= 70 ? "Strong handling" : score >= 50 ? "Moderate handling" : "Weak handling",
      ok: true,
      error: null,
    };
  });

  const okScores = personas.filter((p) => p.ok).map((p) => p.score);
  const composite_score =
    okScores.length > 0 ? Math.round(okScores.reduce((acc, score) => acc + score, 0) / okScores.length) : 0;

  return {
    session_id: input.session_id,
    tenant_id: input.tenant_id,
    candidate_id: input.candidate_id,
    composite_score,
    latency_ms: Date.now() - startedAt,
    personas,
    rubric_version: "v1",
    audit: {
      request_hash,
      timestamp,
      degraded: personas.some((p) => !p.ok),
    },
  };
}
