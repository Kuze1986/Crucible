import { createServiceSupabaseCrucible } from "@/lib/supabase/server";

type EvaluateAuditInsert = {
  session_id: string | null;
  tenant_id: string | null;
  candidate_id: string | null;
  request_hash: string;
  status_code: number;
  latency_ms: number | null;
  degraded: boolean;
  composite_score: number | null;
  error_message: string | null;
};

export async function writeEvaluateAuditLog(entry: EvaluateAuditInsert) {
  try {
    const supabase = createServiceSupabaseCrucible();
    const { error } = await supabase.from("evaluate_audit_logs").insert(entry);
    if (error) {
      console.error("[crucible.evaluate] audit log insert failed", error);
    }
  } catch (error) {
    console.error("[crucible.evaluate] audit log error", error);
  }
}
