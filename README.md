# SIGNAL — Every space has a memory.

> **Tap. Ask. Resolve.** A contextual AI assistant for physical spaces. A visitor taps an NFC tag, chats with the Pip mascot, gets source-aware troubleshooting backed by time-aware memory, and — with approval — a ticket is opened or an operator is reached.

Hackathon build. Target prizes: **SurrealDB Agent Memory**, **Anchor Browser**, **Daytona**.
Full product/architecture spec lives in [`docs/`](docs/) (start with [`docs/playbook/ORIGINAL_README.md`](docs/playbook/ORIGINAL_README.md) and [`docs/09_EXPO_STACK.md`](docs/09_EXPO_STACK.md)).

## Stack

| Layer | Choice |
|---|---|
| App | **Expo SDK 58 + Expo Router** (React Native + web), `web.output = "server"` so `src/app/api/**` are real server routes |
| Hosting | **Vercel** — `expo export -p web` → static client + `api/index.js` serverless handler (`expo-server/adapter/vercel`) |
| Memory | **SurrealDB Agent Memory** via the official `@surrealdb/memory` client |
| Operational DB | SurrealDB Core (not wired yet) |
| LLM | Vercel AI SDK + Anthropic (`ANTHROPIC_API_KEY`) |
| Browser agent | Anchor Browser (`anchorbrowser`) — allowlisted to our own `/demo/maintenance` portal |
| Voice / calls | ElevenLabs (cached cues, later outbound calls) + Twilio |
| Dev sandbox | Daytona (`@daytona/sdk`) |
| Tracing | Arize Phoenix (not wired yet) |

## Quick start

```bash
npm install
cp .env.example .env.local      # then fill values (already filled locally; file is gitignored)
npm run smoke:memory            # write + recall one sourced fact in Agent Memory
npm run web                     # http://localhost:8081  (API routes work in dev)
npm run typecheck
```

Production-like check (what Vercel runs):

```bash
npm run build:web && npm run serve   # http://localhost:8081, then GET /api/health
```

Seed the synthetic Room 204 history into Agent Memory (operator-only):

```bash
curl -X POST http://localhost:8081/api/memory/seed -H "x-demo-secret: <DEMO_OPERATOR_LOGIN_SECRET>"
```

## What is live vs. not (honest status)

| Area | State |
|---|---|
| Agent Memory write/recall, location-scoped via `location=room204` labels | **Live, verified** (`npm run smoke:memory`, `/api/chat`) |
| `/api/health` integration board + `/admin` | **Live** |
| Safety gate (smoke/fire/etc → safety handoff, no model call) | **Live** |
| `/api/chat` LLM reply | Wired, **untested** until `ANTHROPIC_API_KEY` is set; without it the UI shows recalled memory + a visible notice |
| NFC `/t` | **Simulation only**, labelled `DEMO / NFC simulation`. No SUN/SDM verification yet |
| Pip mascot | Placeholder capsule with 6 states + text labels; no audio yet |
| `/demo/maintenance` | Read-only synthetic tickets; not yet backed by a DB, so Anchor can't persist/verify an update |
| SurrealDB Core, incidents, approvals, audit log | Not started |
| Anchor actions, ElevenLabs cues/calls, Phoenix traces | Keys present / SDKs installed, **no code yet** |
| Vercel deploy | Config in repo (`vercel.json`, `api/index.js`); **not deployed yet** |

Rule: only show behaviour that actually runs. Seeded/simulated data is labelled.

## Repo layout

```
src/app/                 Expo Router screens + API routes
  index.tsx              landing
  t.tsx                  NFC landing (GET never consumes a scan)
  s/[session].tsx        visitor chat with Pip
  admin.tsx              integration status board
  demo/maintenance.tsx   owned fake portal (Anchor's only allowed target)
  api/health+api.ts      config + live Agent Memory probe
  api/chat+api.ts        safety gate -> scoped recall -> LLM
  api/memory/seed+api.ts operator-only demo seeding
src/lib/                 env.ts (server-only), memory.ts (Agent Memory), agent/contracts.ts (Zod + policy gate)
src/components/          Pip.tsx, ui.tsx
src/constants/tokens.ts  brand tokens
src/data/                demo-fixtures.json (synthetic Room 204)
api/index.js             Vercel entry for the Expo server bundle
docs/                    spec (01–08), docs/09_EXPO_STACK.md, docs/playbook/ (master playbook + originals)
examples/                reference code from the playbook (excluded from typecheck)
scripts/                 smoke-memory.mjs
AGENTS.md / CLAUDE.md    instructions for AI coding agents
BUILD_PROMPT.md          prompt to hand a coding agent for the next slice
```

## Secrets

Real keys live only in `.env.local` (gitignored) and Vercel env vars. They are temporary hackathon keys — rotate after the event. Nothing is prefixed `EXPO_PUBLIC_`; every integration is called from `src/app/api/**`.
`.mcp.json` reads `AGENT_MEMORY_ENDPOINT` / `AGENT_MEMORY_API_KEY` from the **system** environment (Claude Code does not read `.env.local`).

## Deploy to Vercel

1. Push to GitHub (private repo `SIGNAL`), import into Vercel (framework preset: **Other**; `vercel.json` sets build/output).
2. Add every var from `.env.example` to Vercel (Production + Preview).
3. Point NFC tags at the final HTTPS URL (`/t`) and test on cellular.

Next steps: see [`AGENTS.md`](AGENTS.md#roadmap-vertical-slice-order).
