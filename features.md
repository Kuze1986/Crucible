# Crucible — Feature Reference

## What is Crucible?

Crucible is a SaaS platform for AI conversation quality evaluation. Operators submit web applications or AI agents to BioLoop — a proprietary behavioral engine — which evaluates them against adversarial personas and returns richly scored storyboard results. The platform surfaces where AI products break down under realistic user pressure: goal abandonment, trust erosion, conflict escalation, and UX friction.

Crucible is designed for product teams, AI developers, and UX researchers who need to stress-test AI-assisted flows before they reach real users.

---

## Core Concepts

**Simulation Run** — A single evaluation job. An operator provides a target URL, selects a persona profile, and optionally customises engine weights. BioLoop executes the simulation and returns per-step behavioral signals and aggregate scores.

**Engine Weights** — Eight tunable dials that shape how an adversarial persona behaves during a run:
- `intent` — goal-seeking drive
- `trajectory` — path consistency / rigidity
- `conflict_threshold` — how quickly the persona escalates
- `emotional` — emotional reactivity
- `trust` — baseline trust sensitivity
- `defense` — defensive posturing
- `safety` — risk-aversion and caution
- `curiosity` — how much the persona explores tangents

**Storyboard** — The step-by-step behavioral trace of a run. Each step captures the action taken, the URL visited, and five signal scores: intent alignment, conflict score, emotional signal, trust delta, and experience score — plus a reasoning narrative.

**Score Metrics**
- `overall_conflict_score` (0–1) — aggregate conflict across all steps
- `goal_completion_score` (0–1) — whether the stated goal was achieved
- `experience_score` (0–1) — perceived UX quality
- `trust_trajectory` — `rising | falling | stable | volatile`

---

## System Profiles

Five locked, seed-level profiles are available to all users. Engine weights are pre-tuned for realistic archetypes:

| Profile | Archetype |
|---|---|
| Buyer Journey | Motivated prospect moving toward conversion |
| Skeptical Evaluator | Probes for missing features, compares alternatives |
| Anxious First Timer | Abandons unclear or high-friction flows |
| Conflict Stress Test | Adversarial edge-case finder |
| Power User | Fast-moving, feature-gap exposer, high baseline trust |

Users can create additional custom profiles with arbitrary engine weight combinations.

---

## Pages & Features

### Command Center (`/dashboard`)
The main operational overview for an operator.
- Stat tiles: total runs, completed runs, average conflict score, average goal completion score
- Time-series charts showing score distributions across recent runs
- Recent runs table with direct links to reports
- Quick-access "New Simulation" button

### Builder (`/builder`)
Multi-step wizard for creating a new simulation run.
- **Step 1** — Enter target URL and give the run a title
- **Step 2** — Select a simulation profile (system or custom)
- **Step 3** — Optionally customise engine weights via sliders
- **Step 4** — Optionally set a goal statement, persona context description, and behavioral constraints (blocked actions, forbidden zones)
- Submits to BioLoop; redirects to the monitor page on successful queue

### Library (`/library`)
Full historical run log with server-side filtering, sorting, and pagination.

**Filters:**
- Status (queued / running / completed / failed)
- Simulation profile
- Date range (from / to)
- Conflict score range
- Goal completion score range
- Title text search (debounced 300ms)

**Sorting:** by created date, conflict score, or goal score (descending)

**Pagination:** 25 runs per page with Prev / Next controls and total count display

**Actions per row:**
- Open report (completed runs)
- Open monitor (active runs)
- Cancel run — PATCH to set status `failed`; button disabled while request is in-flight; row updates optimistically

**Export:** "Export CSV" button downloads all currently filtered runs (up to 10,000 rows) as a `.csv` file containing: id, title, target URL, profile, status, all three scores, trust trajectory, created/completed timestamps, and duration.

### Monitor (`/monitor?id=…`)
Real-time view of an active or recently completed run.
- Displays current status, scores, and a live arc-gauge progress indicator
- Receives updates via **Server-Sent Events** (SSE) — no polling; the page updates the moment the orchestrator posts results
- On terminal status (`completed` or `failed`): closes the SSE connection and performs a full reload of run + steps
- Cancel button to abort an in-flight run
- Auto-link to the full report once the run completes

### Report (`/report?id=…`)
Detailed analysis view for a completed run.
- Summary score cards: conflict, goal completion, experience, trust trajectory
- **Session summary** — AI-enriched narrative covering recommendation, goal achieved flag, key strengths, key weaknesses, and trust trajectory detail
- **UX Failure Points** — list of steps where the persona encountered blocking friction, each with step number, failure type, score, URL, and reasoning
- **Storyboard** — full step-by-step behavioral trace in a table; each step shows action, URL, all five signal scores, and behavioral reasoning
- **Conflict heatmap** — visual per-step bar chart of conflict scores

**Sharing & Export:**
- Generate a public share link (token-based, no auth required to view)
- Embed mode — produces an `<iframe>` snippet for embedding the report in external pages
- Copy-to-clipboard button for share URL
- **Print / PDF** — triggers `window.print()`; sidebar, nav, and action buttons are hidden via `@media print` CSS; report content is clean white on print

**DemoForge Export** — if the operator has configured DemoForge, a button exports the run to the DemoForge platform

### Compare (`/compare`)
Side-by-side comparison of multiple runs.
- Select up to 4 runs by ID or from a dropdown
- **Score comparison table** — conflict, goal, experience, trust trajectory for each run in columns
- **Signal heatmaps** — per-step colour intensity maps for each of the five signals across all selected runs
- **Baseline selector** — choose any run as the baseline; all other runs display per-signal delta badges (green = improvement, red = degradation, grey = within threshold)
- **Field-level diff** — `StepDiffCell` component shows raw signal value + coloured delta vs baseline for every step in every run

### Profiles (`/profiles`)
Profile management for custom behavioral archetypes.
- Lists all system profiles (locked, read-only) and user's custom profiles
- Create a new custom profile: name, description, profile type, and per-weight sliders for all eight engine weights
- Edit and delete custom profiles
- System profiles are visible to all users but cannot be modified or deleted

### Settings (`/settings`)
Per-user configuration.

**API Configuration:**
- Orchestrator URL — overrides the Railway / environment-level BioLoop orchestrator
- API Key — stored encrypted; displayed masked (`••••••••xxxx`); leave blank on save to keep the stored key
- "Test connection" button — POSTs to `/api/crucible/settings/test` and shows Reachable / Failed inline

**DemoForge Integration:**
- DemoForge base URL
- Enable/disable the "Export to DemoForge" toggle in the report UI

**Webhooks:**
- Webhook URL — receives a signed POST on every simulation completion
- Webhook secret — used to compute the `X-Crucible-Signature: sha256=<hex>` HMAC-SHA256 header; masked after save
- Payload includes: event type, run ID, title, status, all scores, trust trajectory, report URL, completed_at timestamp

**Notifications:**
- Toggle email notification on simulation complete (sent via Resend)

**Account:**
- Display name field
- Email displayed read-only (from Supabase Auth)

### Teams (`/orgs`)
Organization management for collaborative use.
- Lists all organizations the current user belongs to, with their role
- Create a new team: name and a unique slug (lowercase, numbers, hyphens only)
- Clicking an org opens the org detail page

### Team Detail (`/orgs/[orgId]`)
Per-organization management for admins and owners.
- **Member list** — all members with user ID, role, and join date
- **Role management** — admins and owners can promote/demote members between `member` and `admin`
- **Remove member** — admins/owners can remove any non-owner member; members can leave themselves
- **Invite form** — send an invite email to any address with a selected role (`member` or `admin`); generates a 7-day tokenised invite link; sends email via Resend with the accept URL
- **Pending invites list** — shows unaccepted invites with expiry dates

### Accept Invite (`/invites/[token]`)
Public invite acceptance page (requires app sign-in).
- Displays org name and role from the invite
- If the signed-in user's email doesn't match the invite's target email, shows a warning and disables the accept button
- On accept: creates the org membership, marks the invite as accepted, redirects to the org detail page

### Shared Report (`/share/[token]`)
Unauthenticated public view of a completed report.
- Accessible without signing in via a share token
- Supports embed mode (`?embed=1`) — strips all chrome for clean iframe embedding
- Displays the full report UI (scores, summary, UX failure points, storyboard)

### Admin Console (`/admin`)
Operator-level management dashboard — protected by a separate admin password (not Supabase Auth).

**Usage tiles:**
- Runs created today
- Runs created this week
- Runs created this month
- Currently active runs (queued + running)

**Recent completions table** — last 10 completed runs with title, status, conflict score, goal score, user ID, and created date

**Top users table** — top 10 users ranked by total run count (via `admin_top_users_by_run_count` database RPC)

---

## API Endpoints

### Runs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crucible/runs` | List runs — server-side pagination, all filters, CSV export |
| POST | `/api/crucible/runs` | Create run — validates, merges engine weights, submits to BioLoop |
| GET | `/api/crucible/runs/[id]` | Fetch single run + storyboard steps |
| PATCH | `/api/crucible/runs/[id]` | Update run (cancel, DemoForge flag) |
| GET | `/api/crucible/runs/[id]/events` | SSE stream of run status/score updates |
| POST | `/api/crucible/runs/[id]/sync` | Pull latest state from orchestrator |
| POST | `/api/crucible/runs/[id]/steps` | Append storyboard steps (orchestrator callback) |

### Profiles
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crucible/profiles` | List system + custom profiles |
| POST | `/api/crucible/profiles` | Create custom profile |
| GET | `/api/crucible/profiles/[id]` | Fetch single profile |
| PATCH | `/api/crucible/profiles/[id]` | Update custom profile |
| DELETE | `/api/crucible/profiles/[id]` | Delete custom profile |

### Settings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crucible/settings` | Fetch user settings (secrets masked) |
| PATCH | `/api/crucible/settings` | Update settings |
| POST | `/api/crucible/settings/test` | Test orchestrator connectivity |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crucible/notifications` | List notifications + unread count |
| PATCH | `/api/crucible/notifications` | Mark notifications read (by IDs or `"all"`) |

### Organizations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crucible/orgs` | List user's orgs with membership role |
| POST | `/api/crucible/orgs` | Create org + auto-add creator as owner |
| GET | `/api/crucible/orgs/[orgId]` | Fetch org detail |
| PATCH | `/api/crucible/orgs/[orgId]` | Rename org (admin/owner) |
| DELETE | `/api/crucible/orgs/[orgId]` | Delete org (owner only) |
| GET | `/api/crucible/orgs/[orgId]/members` | List members |
| PATCH | `/api/crucible/orgs/[orgId]/members/[memberId]` | Update member role |
| DELETE | `/api/crucible/orgs/[orgId]/members/[memberId]` | Remove member |
| GET | `/api/crucible/orgs/[orgId]/invites` | List pending invites |
| POST | `/api/crucible/orgs/[orgId]/invites` | Create invite + send email |
| GET | `/api/crucible/invites/[token]` | Preview invite (public) |
| POST | `/api/crucible/invites/[token]` | Accept invite (auth required) |

### Evaluate & Callback (BioLoop-facing)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/crucible/evaluate` | Public endpoint — receives 6-persona evaluation results; rate-limited (20/min); CORS-enabled; audit-logged |
| POST | `/api/crucible/callback` | Orchestrator job completion callback — updates run, triggers post-completion hooks |

### Session State (DemoForge/Kuze)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/crucible/session/[sessionId]/state` | Fetch Kuze session state (trajectory, friction, pivot) |
| POST | `/api/crucible/session/[sessionId]/signal` | Record a behavioral signal |

### Auth & Admin
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/admin/login` | Admin password authentication |
| POST | `/api/admin/logout` | Clear admin session cookie |
| GET/POST | `/api/auth/callback` | Supabase OAuth callback |
| GET | `/api/health` | Health check |

---

## Post-Simulation Hooks

When a run reaches `completed` status, the following happen in sequence:

1. **In-app notification** — a `run_complete` notification row is inserted for the user
2. **AI enrichment** — the session summary is enriched via Anthropic (recommendation, strengths, weaknesses, trust detail)
3. **Email notification** — if the user has enabled `notify_email_on_complete`, a completion email is sent via Resend
4. **Webhook delivery** — if the user has configured a webhook URL, a signed POST is delivered with the full run payload

When a run is cancelled (status set to `failed` via PATCH), a `run_failed` notification is inserted.

---

## Notification System

**Bell icon** in the app header shows the current unread count (fetched server-side on every page load).

**Dropdown** opens on click: fetches the latest notifications, shows each with title, body, and a link to the associated report.

**Mark all read** button sets `read_at` for all user notifications in a single PATCH.

Notification types: `run_complete`, `run_failed`, `system`

---

## Webhook System

Triggered automatically on run completion.

**Payload fields:**
- `event` — `"simulation.complete"`
- `run_id`, `title`, `status`
- `overall_conflict_score`, `goal_completion_score`, `experience_score`, `trust_trajectory`
- `report_url` — absolute URL to the report
- `completed_at`

**Security:** If a webhook secret is configured, the request includes an `X-Crucible-Signature: sha256=<hex>` header computed via HMAC-SHA256. Consumers should verify this signature before trusting the payload.

---

## Organisation / Team Model

**Roles:** `owner` > `admin` > `member`

**Access rules:**
- Members can see the org, its members, and runs scoped to that org
- Admins can invite new members, change roles (except owner), and remove non-owner members
- Owners can do everything admins can, plus rename or delete the org
- Owner role cannot be changed or removed via the API

**Org switcher** in the app header allows switching between Personal context and any org the user belongs to. The active selection persists in `localStorage`. When an org is active, the Library and CSV export filter to that org's runs.

**Invites** expire after 7 days. Acceptance is locked to the email address on the invite.

---

## Database Schema

All tables live in the `crucible` Postgres schema. Row Level Security (RLS) is enabled on every table.

| Table | Purpose |
|---|---|
| `user_settings` | Per-user orchestrator config, DemoForge config, webhook config, notification preferences |
| `simulation_profiles` | System + custom behavioral profiles with engine weights |
| `simulation_runs` | Full run records: config, status, scores, artifact URLs, share token, org_id |
| `storyboard_steps` | Per-step behavioral trace with five signal scores and reasoning |
| `evaluate_audit_logs` | Audit log of every call to the public evaluate endpoint |
| `bioloop_evaluation_events` | Per-persona evaluation results from the 6-persona gauntlet |
| `notifications` | In-app notifications (run_complete, run_failed, system) with read_at tracking |
| `organizations` | Team records with name, slug, owner |
| `org_members` | Membership table: org_id × user_id × role |
| `org_invites` | Tokenised invite records with email, role, 7-day expiry |

---

## Integrations

| Service | Purpose |
|---|---|
| **BioLoop** | Proprietary behavioral engine — all simulation execution and scoring |
| **Supabase** | Postgres database, auth (email/OAuth), Row Level Security, storage |
| **Anthropic** | Session summary enrichment (post-completion AI narrative) |
| **Resend** | Transactional email (simulation complete notification, org invite) |
| **DemoForge** | Export runs; Kuze session state and behavioral signal recording |

---

## Environment Variables

```
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
ADMIN_PASSWORD=

# BioLoop orchestrator (users can override per-account in Settings)
BIOLOOP_ORCHESTRATOR_URL=
BIOLOOP_SERVICE_KEY=

# Anthropic — session summary enrichment
ANTHROPIC_API_KEY=

# Resend — email notifications and org invites
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# DemoForge / Kuze chat widget
NEXT_PUBLIC_KUZE_URL=

# Optional overrides
NEXT_PUBLIC_SUPABASE_SCHEMA=         # defaults to "crucible"
CRUCIBLE_EVALUATE_RATE_LIMIT_PER_MINUTE=   # defaults to 20
CRUCIBLE_EVALUATE_CORS_ORIGINS=      # comma-separated allowed origins for /evaluate
```
