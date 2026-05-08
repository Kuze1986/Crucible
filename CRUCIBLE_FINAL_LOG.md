# Crucible — production verification (operator log)

Log format:

```
[CATEGORY] Description
STATUS: CONFIRMED | FIXED | CANNOT CONFIRM (reason)
```

Environment for this run: **Crucible repo only** (`C:\Users\Administrator\Projects\Crucible`). `CRUCIBLE_URL` and `BIOLOOP_SERVICE_KEY` were **not** set in the shell; no Supabase SQL session available. Sibling app repos listed under `Projects`: **Crucible**, **ai-twin** only (no Shift / Scripta / Keystone / Axis / DemoForge trees on disk for this workspace).

---

## PART A — Live endpoint tests (Railway)

[API] **Test 1 (valid payload, HTTP 200)** — run operator `curl` against Railway with real key.  
STATUS: **CANNOT CONFIRM** (no `CRUCIBLE_URL` / `BIOLOOP_SERVICE_KEY` in agent environment; cannot call your tenant).

[API] **Verification prompt Test 1 JSON is not valid for this service** — body uses `persona` and snake-case labels (`anxious_first_timer`, …) and `response: ""`. Crucible expects `persona_id` (e.g. `p-anxious-first-timer`), non-empty `prompt` and `response` per `EvaluateRequestSchema` (`lib/crucible/evaluate.ts`). As written, Test 1 would return **400**, not 200.  
STATUS: **FIXED** (documented here; use corrected payload below).

**Corrected Test 1 example** (same semantics as `scripts/fixtures/evaluate-payload.json`; swap `session_id` for a unique audit row):

```bash
curl -sS -w "\nHTTP %{http_code}\n" -X POST "$CRUCIBLE_URL/api/crucible/evaluate" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: $API_KEY" \
  -d @scripts/fixtures/evaluate-payload.json
```

Or inline with `session_id` / `tenant_id` / `candidate_id` matching your test and six objects shaped as  
`{ "persona_id": "p-anxious-first-timer", "prompt": "…", "response": "…" }` … through `p-busy-exec`.

[API] **Test 2 (malformed → 400, clean message)** — requires authenticated `POST`.  
STATUS: **CANNOT CONFIRM** (same: no live URL + key from this agent).

[API] **Test 3 (no auth → 401)**  
STATUS: **CANNOT CONFIRM** on Railway; **CONFIRMED** previously against local dev in audit session.

[API] **Test 4 (CORS preflight, `x-api-key` allowed)**  
STATUS: **CANNOT CONFIRM** on Railway; **CONFIRMED** locally (`OPTIONS` returned `access-control-allow-headers` including `x-api-key`, `x-bioloop-key`).

---

## PART B — Latency stress test

[API] **`node scripts/evaluate-stress.mjs`** with `CRUCIBLE_URL` + `BIOLOOP_SERVICE_KEY`, concurrency 10, p50/p95/p99 emitted.  
STATUS: **FIXED** (script now prints `p50_ms`, `p95_ms`, `p99_ms`; was p95-only).

[API] p95 &lt; 10s, no 5xx across 10 concurrent calls.  
STATUS: **CANNOT CONFIRM** (script not executed against Railway; requires operator env).

---

## PART C — BioLoop output (Supabase SQL)

[BIOLOOP] Rows in `crucible.bioloop_output_events` and `crucible.reporting_outbox` after successful evaluate; `processed_at` null on new outbox rows.  
STATUS: **CANNOT CONFIRM** (no access to nexus-core SQL editor from this agent).

---

## PART D — Cross-NEXUS caller verification

[REGISTRY] **The Shift, Scripta, Keystone, Axis, DemoForge** — search for `VITE_CRUCIBLE_URL` / `NEXT_PUBLIC_CRUCIBLE_URL` / `crucible.*evaluate` / `crucibleApiKey` under `Projects`.  
STATUS: **CANNOT CONFIRM** (those repositories are not present beside Crucible on this machine).

[REGISTRY] **ai-twin (Kuze)** — `server/src/crucibleClient.ts` uses `CRUCIBLE_SIM_BASE_URL` and `CRUCIBLE_SIM_API_KEY` for **`GET /api/crucible/session/:id/state`**, not the evaluate endpoint; `server/src/env.ts` defines `CRUCIBLE_SIM_*` and `BIOLOOP_SERVICE_KEY`.  
STATUS: **CONFIRMED** (partial integration: session state only; naming differs from prompt’s `VITE_CRUCIBLE_URL`).

[REGISTRY] **Crucible repo** — evaluate API documented in `README.md`; no separate `src/lib/crucible.ts` (this app is the server).  
STATUS: **CONFIRMED** (N/A as client).

---

## CRUCIBLE FINAL SUMMARY

Live endpoint tests:

- Valid payload (200): **CANNOT CONFIRM** (run on Railway with corrected JSON + key)
- Malformed (400): **CANNOT CONFIRM**
- No auth (401): **CONFIRMED** (local only) / **CANNOT CONFIRM** (Railway)
- CORS preflight: **CONFIRMED** (local only) / **CANNOT CONFIRM** (Railway)

Latency: p50=— | p95=— | p99=— (under 10s: **—**; run `CRUCIBLE_URL=… BIOLOOP_SERVICE_KEY=… node scripts/evaluate-stress.mjs`)

BioLoop outputs confirmed: **NO** (SQL not run from this session)

Cross-NEXUS callers with `src/lib/crucible.ts` (per prompt):

- The Shift: **NO** (repo not available here)
- Scripta: **NO**
- Keystone: **NO**
- Axis: **NO**
- DemoForge: **NO**

**Status: NEEDS FIXES** — meaning **operator verification is incomplete**, not that the Crucible build is red. Codebase remains **green** (`typecheck`, `build`, `lint`). Re-run this log after Railway + Supabase checks and paste results under Part A–C.

---

## Operator checklist (copy-paste)

1. `export CRUCIBLE_URL=…` and `export BIOLOOP_SERVICE_KEY=…` (or `API_KEY` for curl header).
2. Valid POST using **`scripts/fixtures/evaluate-payload.json`** (or equivalent six `persona_id` / `prompt` / `response` objects).
3. `CRUCIBLE_URL=… BIOLOOP_SERVICE_KEY=… node scripts/evaluate-stress.mjs` → record `p50_ms`, `p95_ms`, `p99_ms`.
4. Supabase: run the two `SELECT` queries from the verification prompt; confirm new rows for your `session_id`.
5. In each NEXUS app repo: `grep` for Crucible URL + evaluate usage; align env names with **this** API (`x-api-key` / `x-bioloop-key`, `BIOLOOP_SERVICE_KEY` on server).
