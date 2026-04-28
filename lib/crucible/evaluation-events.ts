import type { EvaluateResponse } from "@/lib/crucible/evaluate";
import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

export async function writeEvaluationOutputEvent(input: {
  sessionId: string;
  tenantId: string;
  candidateId: string;
  requestHash: string;
  response: EvaluateResponse;
}) {
  try {
    const supabase = createServiceSupabaseCrucible();
    const { data, error } = await supabase
      .from("bioloop_output_events")
      .insert({
        event_type: "crucible.evaluate.completed",
        session_id: input.sessionId,
        tenant_id: input.tenantId,
        candidate_id: input.candidateId,
        request_hash: input.requestHash,
        payload: input.response,
      })
      .select("id")
      .single();

    if (error || !data?.id) {
      console.error("[crucible.evaluate] output event insert failed", error);
      return;
    }

    const { error: outboxError } = await supabase.from("reporting_outbox").insert({
      source: "crucible",
      event_id: data.id,
      session_id: input.sessionId,
      tenant_id: input.tenantId,
      status: "ready",
    });

    if (outboxError) {
      console.error("[crucible.evaluate] outbox insert failed", outboxError);
    }
  } catch (error) {
    console.error("[crucible.evaluate] output event error", error);
  }
}
