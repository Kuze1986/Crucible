import { z } from "zod";

import { testOrchestratorConnection } from "@/lib/bioloop/client";
import { requireSessionUser } from "@/app/api/crucible/_auth";

const BodySchema = z.object({
  orchestrator_url: z.string().url(),
  orchestrator_api_key: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await requireSessionUser();
  if ("error" in session) return session.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ok = await testOrchestratorConnection(
    parsed.data.orchestrator_url,
    parsed.data.orchestrator_api_key
  );
  return Response.json({ ok });
}
