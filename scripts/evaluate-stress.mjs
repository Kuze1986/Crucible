import { readFile } from "node:fs/promises";

const baseUrl = (process.env.CRUCIBLE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const key = process.env.BIOLOOP_SERVICE_KEY;
const endpoint = `${baseUrl}/api/crucible/evaluate`;
const payloadPath = new URL("./fixtures/evaluate-payload.json", import.meta.url);
const concurrency = Number(process.env.EVALUATE_STRESS_CONCURRENCY ?? 10);

if (!key) {
  console.error("Missing BIOLOOP_SERVICE_KEY");
  process.exit(1);
}

const rawPayload = await readFile(payloadPath, "utf8");
const payload = JSON.parse(rawPayload);

const calls = Array.from({ length: concurrency }, async (_, idx) => {
  const body = {
    ...payload,
    session_id: `${payload.session_id}-stress-${idx + 1}`,
  };
  const start = Date.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bioloop-key": key,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, elapsedMs: Date.now() - start, body: json };
});

const results = await Promise.all(calls);
const ok = results.filter((r) => r.status === 200).length;
const non200 = results.filter((r) => r.status !== 200);
const p95 = [...results.map((r) => r.elapsedMs)].sort((a, b) => a - b)[Math.floor(results.length * 0.95) - 1] ?? 0;

console.log(
  JSON.stringify(
    {
      endpoint,
      concurrency,
      ok,
      failed: non200.length,
      p95_ms: p95,
      failures: non200.slice(0, 3),
    },
    null,
    2
  )
);

if (non200.length > 0) {
  process.exit(1);
}
