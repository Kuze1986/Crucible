import { readFile } from "node:fs/promises";

const baseUrl = (process.env.CRUCIBLE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const key = process.env.BIOLOOP_SERVICE_KEY;
const endpoint = `${baseUrl}/api/crucible/evaluate`;
const payloadPath = new URL("./fixtures/evaluate-payload.json", import.meta.url);

if (!key) {
  console.error("Missing BIOLOOP_SERVICE_KEY");
  process.exit(1);
}

const rawPayload = await readFile(payloadPath, "utf8");
const payload = JSON.parse(rawPayload);

async function runOnce() {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bioloop-key": key,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  return { status: res.status, json };
}

const first = await runOnce();
const second = await runOnce();

if (first.status !== 200 || second.status !== 200) {
  console.error("Evaluate call failed", { firstStatus: first.status, secondStatus: second.status });
  console.error({ first: first.json, second: second.json });
  process.exit(1);
}

const firstPersonaScores = first.json.personas.map((p) => p.score);
const secondPersonaScores = second.json.personas.map((p) => p.score);
const sameComposite = first.json.composite_score === second.json.composite_score;
const samePersonaScores = JSON.stringify(firstPersonaScores) === JSON.stringify(secondPersonaScores);

if (!sameComposite || !samePersonaScores) {
  console.error("Determinism check failed", {
    firstComposite: first.json.composite_score,
    secondComposite: second.json.composite_score,
    firstPersonaScores,
    secondPersonaScores,
  });
  process.exit(1);
}

console.log("Determinism check passed");
console.log(
  JSON.stringify(
    {
      composite_score: first.json.composite_score,
      persona_scores: firstPersonaScores,
    },
    null,
    2
  )
);
