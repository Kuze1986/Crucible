import { createHash } from "node:crypto";

import { checkRateLimit } from "@/lib/api/rate-limit";
import { writeEvaluateAuditLog } from "@/lib/crucible/evaluate-audit";
import { writeEvaluationOutputEvent } from "@/lib/crucible/evaluation-events";
import {
  EvaluateRequestSchema,
  EvaluateResponseSchema,
  runSixPersonaGauntlet,
  type EvaluateResponse,
} from "@/lib/crucible/evaluate";

const RATE_LIMIT_PER_MINUTE = Number(process.env.CRUCIBLE_EVALUATE_RATE_LIMIT_PER_MINUTE ?? 20);

export async function POST(request: Request) {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();
  const rawBody = await request.text();
  const requestHash = createHash("sha256").update(rawBody || "").digest("hex");
  const apiKey = request.headers.get("x-bioloop-key") ?? request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.BIOLOOP_SERVICE_KEY) {
    await writeEvaluateAuditLog({
      session_id: null,
      tenant_id: null,
      candidate_id: null,
      request_hash: requestHash,
      status_code: 401,
      latency_ms: Date.now() - startedAt,
      degraded: false,
      composite_score: null,
      error_message: "Unauthorized",
    });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientKey = forwardedFor?.split(",")[0]?.trim() || "unknown";
  const limiter = checkRateLimit({
    key: `crucible-evaluate:${clientKey}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60_000,
  });
  if (!limiter.ok) {
    await writeEvaluateAuditLog({
      session_id: null,
      tenant_id: null,
      candidate_id: null,
      request_hash: requestHash,
      status_code: 429,
      latency_ms: Date.now() - startedAt,
      degraded: false,
      composite_score: null,
      error_message: "Rate limit exceeded",
    });
    return Response.json(
      { error: "Rate limit exceeded", retry_after_ms: Math.max(limiter.resetAt - Date.now(), 0) },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(Math.max(limiter.resetAt - Date.now(), 0) / 1000)),
          "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE),
          "X-RateLimit-Remaining": String(limiter.remaining),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = rawBody ? (JSON.parse(rawBody) as unknown) : {};
  } catch {
    await writeEvaluateAuditLog({
      session_id: null,
      tenant_id: null,
      candidate_id: null,
      request_hash: requestHash,
      status_code: 400,
      latency_ms: Date.now() - startedAt,
      degraded: false,
      composite_score: null,
      error_message: "Invalid JSON",
    });
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = EvaluateRequestSchema.safeParse(body);
  if (!parsed.success) {
    await writeEvaluateAuditLog({
      session_id: null,
      tenant_id: null,
      candidate_id: null,
      request_hash: requestHash,
      status_code: 400,
      latency_ms: Date.now() - startedAt,
      degraded: false,
      composite_score: null,
      error_message: "Schema validation failed",
    });
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  console.info("[crucible.evaluate] request", {
    timestamp,
    request_hash: requestHash,
    session_id: parsed.data.session_id,
    tenant_id: parsed.data.tenant_id,
  });

  try {
    const personas = await runSixPersonaGauntlet(parsed.data);
    const okScores = personas.filter((p) => p.ok).map((p) => p.score);
    const compositeScore =
      okScores.length > 0 ? Math.round(okScores.reduce((acc, score) => acc + score, 0) / okScores.length) : 0;
    const latencyMs = Date.now() - startedAt;
    const degraded = personas.some((p) => !p.ok);

    const response: EvaluateResponse = {
      session_id: parsed.data.session_id,
      tenant_id: parsed.data.tenant_id,
      candidate_id: parsed.data.candidate_id,
      composite_score: compositeScore,
      latency_ms: latencyMs,
      personas,
      rubric_version: "v1",
      audit: {
        request_hash: requestHash,
        timestamp,
        degraded,
      },
    };
    const responseParse = EvaluateResponseSchema.safeParse(response);
    if (!responseParse.success) {
      const message = "Response schema mismatch";
      console.error("[crucible.evaluate] response schema", responseParse.error.flatten());
      await writeEvaluateAuditLog({
        session_id: parsed.data.session_id,
        tenant_id: parsed.data.tenant_id,
        candidate_id: parsed.data.candidate_id,
        request_hash: requestHash,
        status_code: 500,
        latency_ms: Date.now() - startedAt,
        degraded: true,
        composite_score: null,
        error_message: message,
      });
      return Response.json({ error: message }, { status: 500 });
    }

    console.info("[crucible.evaluate] response", {
      timestamp,
      request_hash: requestHash,
      session_id: parsed.data.session_id,
      composite_score: compositeScore,
      latency_ms: latencyMs,
      degraded,
    });

    await writeEvaluateAuditLog({
      session_id: parsed.data.session_id,
      tenant_id: parsed.data.tenant_id,
      candidate_id: parsed.data.candidate_id,
      request_hash: requestHash,
      status_code: 200,
      latency_ms: latencyMs,
      degraded,
      composite_score: compositeScore,
      error_message: null,
    });
    await writeEvaluationOutputEvent({
      sessionId: parsed.data.session_id,
      tenantId: parsed.data.tenant_id,
      candidateId: parsed.data.candidate_id,
      requestHash,
      response: responseParse.data,
    });

    return Response.json(responseParse.data, {
      status: 200,
      headers: {
        "X-RateLimit-Limit": String(RATE_LIMIT_PER_MINUTE),
        "X-RateLimit-Remaining": String(limiter.remaining),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Evaluation failed";
    console.error("[crucible.evaluate] error", {
      timestamp,
      request_hash: requestHash,
      message,
    });
    await writeEvaluateAuditLog({
      session_id: parsed.data.session_id,
      tenant_id: parsed.data.tenant_id,
      candidate_id: parsed.data.candidate_id,
      request_hash: requestHash,
      status_code: 500,
      latency_ms: Date.now() - startedAt,
      degraded: true,
      composite_score: null,
      error_message: message,
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
