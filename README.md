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

- With `NEXT_PUBLIC_NEXUS_LOGIN_URL`, unauthenticated users are sent to Nexus SSO.
- Without it, **development** exposes an email magic link form; production expects Nexus URL or your own IdP wiring via `auth/callback`.

## Proxy (Next.js 16)

Session refresh uses [`proxy.ts`](proxy.ts) (not `middleware.ts`).
