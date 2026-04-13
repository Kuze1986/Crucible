import Anthropic from "@anthropic-ai/sdk";

import type { SessionSummaryDoc } from "@/lib/crucible/types";

const MODEL = "claude-sonnet-4-20250514";

export async function enrichSessionSummaryWithAnthropic(input: {
  runTitle: string;
  targetUrl: string;
  existing: SessionSummaryDoc | null;
  stepCount: number;
}): Promise<SessionSummaryDoc | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });
  const prompt = `You are analyzing a behavioral simulation of a website visit.
Run title: ${input.runTitle}
Target URL: ${input.targetUrl}
Storyboard steps recorded: ${input.stepCount}
Existing summary JSON (may be empty): ${JSON.stringify(input.existing ?? {})}

Return a single JSON object only (no markdown) with keys: recommendation (string), trust_trajectory_detail (string), goal_achieved (boolean), key_strengths (string array, max 5), key_weaknesses (string array, max 5).
Be concise and operational.`;

  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return null;
    const parsed = JSON.parse(text.text) as SessionSummaryDoc;
    return { ...input.existing, ...parsed };
  } catch (e) {
    console.error("[anthropic] enrichSessionSummary", e);
    return null;
  }
}
