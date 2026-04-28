# Crucible

Behavioral simulation platform for NEXUS Holdings. Operators configure personas and engine weights, launch runs against a target URL, and review storyboards, conflict heatmaps, and session intelligence.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui (Base UI)
- Supabase (`crucible` schema on project **nexus-core**)
- BioLoop Orchestrator for job dispatch and callbacks
- Anthropic and Resend (optional)

## Setup

1. Copy [`.env.example`](.env.example) to `.env.local` and fill values.
2. Apply SQL in [`supabase/migrations/`](supabase/migrations/) to the nexus-core project (SQL editor or Supabase CLI).
3. `npm install` then `npm run dev`.

## Railway

Set `NEXT_PUBLIC_APP_URL` to the public HTTPS URL of this service so the orchestrator can call `POST /api/crucible/callback`. Configure Supabase and BioLoop keys in Railway variables.

## Auth

- Crucible uses direct Supabase authentication for operator sign-in.

## Evaluate API

- Endpoint: `POST /api/crucible/evaluate`
- Auth header: `x-bioloop-key` (or `x-api-key`) must match `BIOLOOP_SERVICE_KEY`
- Rate limit: in-memory, per-IP, default `20` requests/minute (configurable via `CRUCIBLE_EVALUATE_RATE_LIMIT_PER_MINUTE`)
- Persistent audit logs: writes to `crucible.evaluate_audit_logs` (apply migration first)
- BioLoop/output integration: writes completed evaluate events to `crucible.bioloop_output_events` and `crucible.reporting_outbox`
- Request body:
  - `session_id: string`
  - `tenant_id: string`
  - `candidate_id: string`
  - `attempts: [6 items]` where each item is `{ persona_id, prompt, response }`
- Response body:
  - `composite_score: number`
  - `personas: [6 items]` with `score`, `challenge_type`, `voice_style`, `stress_triggered`, `ok`, `error`
  - `audit.request_hash` and `audit.timestamp`

### Evaluate audit scripts

- Determinism fixture check:
  - `CRUCIBLE_URL=https://<host> BIOLOOP_SERVICE_KEY=<key> npm run audit:evaluate:consistency`
- Weak vs strong score spot-check:
  - `CRUCIBLE_URL=https://<host> BIOLOOP_SERVICE_KEY=<key> npm run audit:evaluate:spotcheck`
- 10-call concurrency stress:
  - `CRUCIBLE_URL=https://<host> BIOLOOP_SERVICE_KEY=<key> npm run audit:evaluate:stress`

## Admin

- Set `ADMIN_PASSWORD` to enable [`/admin/login`](app/admin/login/page.tsx) (password + signed **httpOnly** cookie, 7-day session). This is **separate** from Supabase app sign-in; use it for operator access or when debugging auth.

## Proxy (Next.js 16)

Session refresh uses [`proxy.ts`](proxy.ts) (not `middleware.ts`).
