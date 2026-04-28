import { readFile } from "node:fs/promises";

const baseUrl = (process.env.CRUCIBLE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const key = process.env.BIOLOOP_SERVICE_KEY;
const endpoint = `${baseUrl}/api/crucible/evaluate`;
const strongPath = new URL("./fixtures/evaluate-payload.json", import.meta.url);
const weakPath = new URL("./fixtures/evaluate-payload-weak.json", import.meta.url);

if (!key) {
  console.error("Missing BIOLOOP_SERVICE_KEY");
  process.exit(1);
}

const strongPayload = JSON.parse(await readFile(strongPath, "utf8"));
const weakPayload = JSON.parse(await readFile(weakPath, "utf8"));

async function callEvaluate(body) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bioloop-key": key,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

const strong = await callEvaluate(strongPayload);
const weak = await callEvaluate(weakPayload);

if (strong.status !== 200 || weak.status !== 200) {
  console.error("Spot-check requests failed", { strongStatus: strong.status, weakStatus: weak.status });
  console.error({ strong: strong.json, weak: weak.json });
  process.exit(1);
}

if (strong.json.composite_score <= weak.json.composite_score) {
  console.error("Scoring regression: strong response did not beat weak response", {
    strongComposite: strong.json.composite_score,
    weakComposite: weak.json.composite_score,
  });
  process.exit(1);
}

console.log("Spot-check passed");
console.log(
  JSON.stringify(
    {
      strong_composite: strong.json.composite_score,
      weak_composite: weak.json.composite_score,
      delta: strong.json.composite_score - weak.json.composite_score,
    },
    null,
    2
  )
);
