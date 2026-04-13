export type BehavioralSimulationJobBody = {
  actor_id: string;
  product: "crucible";
  job_type: "behavioral_simulation";
  priority: number;
  context: {
    target_url: string;
    simulation_profile: string;
    engine_weights: Record<string, number>;
    goal: string;
    persona_context: object | null;
    constraints: object | null;
  };
  callback_url: string;
};

export type CreateJobResponse = {
  job_id: string;
  status: string;
};

export type LatestJobResponse = {
  job_id?: string;
  status?: string;
  result?: unknown;
  timestamps?: Record<string, unknown>;
};

export class BioLoopOrchestratorError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string
  ) {
    super(message);
    this.name = "BioLoopOrchestratorError";
  }
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function createBehavioralSimulationJob(
  baseUrl: string,
  apiKey: string,
  body: BehavioralSimulationJobBody
): Promise<CreateJobResponse> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/jobs`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bioloop-key": apiKey,
    },
    body: JSON.stringify(body),
  });
  const parsed = await parseJsonSafe(res);
  if (!res.ok) {
    const bodyStr = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new BioLoopOrchestratorError(
      `Orchestrator create job failed (${res.status})`,
      res.status,
      bodyStr
    );
  }
  const obj = parsed as Record<string, unknown>;
  const job_id = typeof obj.job_id === "string" ? obj.job_id : "";
  const status = typeof obj.status === "string" ? obj.status : "";
  if (!job_id) {
    throw new BioLoopOrchestratorError(
      "Orchestrator response missing job_id",
      res.status,
      JSON.stringify(parsed)
    );
  }
  return { job_id, status };
}

export async function getLatestJobForActor(
  baseUrl: string,
  apiKey: string,
  actorId: string
): Promise<LatestJobResponse> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/v1/jobs/${encodeURIComponent(actorId)}/latest`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "x-bioloop-key": apiKey },
    cache: "no-store",
  });
  const parsed = (await parseJsonSafe(res)) as LatestJobResponse | string;
  if (!res.ok) {
    const bodyStr = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new BioLoopOrchestratorError(
      `Orchestrator latest job failed (${res.status})`,
      res.status,
      bodyStr
    );
  }
  if (parsed && typeof parsed === "object") return parsed as LatestJobResponse;
  return {};
}

export async function testOrchestratorConnection(baseUrl: string, apiKey: string) {
  const base = baseUrl.replace(/\/$/, "");
  const url = `${base}/api/v1/jobs/__crucible_health__/latest`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "x-bioloop-key": apiKey },
    cache: "no-store",
  });
  return res.ok || res.status === 404;
}
