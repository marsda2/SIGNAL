# SIGNAL — Every space has a memory.

> **Tap. Ask. Resolve.** A contextual AI assistant for physical spaces. A visitor taps an NFC tag, chats with the Pip mascot, gets source-aware troubleshooting backed by time-aware memory, and — with approval — a ticket is opened or updated in the maintenance portal.

Hackathon build. Target prizes: **SurrealDB Agent Memory**, **Anchor Browser**, **Daytona**.
Full spec lives in [`docs/`](docs/) (start with [`docs/playbook/ORIGINAL_README.md`](docs/playbook/ORIGINAL_README.md), [`docs/09_EXPO_STACK.md`](docs/09_EXPO_STACK.md), NFC in [`docs/10_NFC_SETUP.md`](docs/10_NFC_SETUP.md)).

## Where we are (2026-10-16)

**Phase: integration done, verification pending.** Every integration has code: chat with Gemini, memory, incident database, Anchor, voice cues, tracing and Daytona. Typecheck, the production build and the Daytona sandbox run pass. Several pieces are blocked on **credentials or a live test, not on code**. The NFC chip is written with the SIGNAL dataset; the phone → `/t` → chat path is the next thing to prove.

Demo story — the **Pitch Area** (default demo space, `src/data/demo-spaces.json`):

1. Tap the chip on the pitch stage → `/t` verifies the SUN signature → chat opens for **Pitch Area** with "Common here" presets (frequent issues from Agent Memory + the operator's FAQs).
2. Tap "Right projector: flickers and goes black" (or type it) → Pip: *"This was already reported 2 days ago (P-202) and it's still open — latest note: replacement cable ordered."* with a **Seen before** card.
3. Pip offers **"Add my report to P-202 and escalate"** plus tap-to-call / email buttons from the space's escalation settings.
4. Visitor approves → **Anchor** updates P-202 on `/demo/maintenance` (live view link) → SIGNAL **reads the ticket back** from Core → card turns **VERIFIED** with evidence.
5. Judge opens the **Phoenix trace** for that turn, and `/admin/spaces` to see how an operator configures a space.

Room 204 (`/s/room204`) stays as the second space (scenarios S1–S4 in `src/data/demo-fixtures.json`).

### Demo space: Pitch Area

| | |
|---|---|
| Equipment | Left projector, right projector (both mirror the podium), presenter laptop + clicker, guest Wi-Fi (`Pitch-Guest` / `Pitch-Guest-5G`), keypad lock on the equipment-room door |
| Past reports (synthetic; dates stay relative to every reset) | P-201 left projector "No signal" — fixed 9 days ago (Duplicate display) · **P-202 right projector flickers — OPEN, 2 days ago** · P-203 clicker — fixed 6 days ago (battery) · P-204 Wi-Fi slow — fixed 4 days ago (use 5G) · **P-205 door keypad rejects code — OPEN, yesterday (urgent)** · P-206 Wi-Fi password — fixed 12 days ago |
| FAQs | Connect laptop to projectors · Wi-Fi network · Presenter laptop · Door keypad · Who to contact |
| Escalation | Urgent line `+1 555 0100` (demo number), `facilities@signal-demo.example`, SIGNAL portal (Anchor) |

Try: "the right projector keeps going black", "the door keypad won't take the code", "what's the wifi network?", "my laptop shows no signal on the left projector".

## What is live vs. not (honest status)

| Area | State | Blocked on |
|---|---|---|
| Agent Memory write/recall, scoped by `location=room204` | **Live, verified** (`npm run smoke:memory`, `/api/chat`) | — |
| Safety gate (smoke/fire/… → safety handoff, no model call) | **Live** | — |
| `/api/health` + `/admin` status board (memory, Core, tracing probes) | **Live** | — |
| Chat decision: Gemini 3.8 Flash (medium thinking) → `DecisionSchema` → policy gate → typed events | Wired. Recall + Core + model call ran end to end; **Google returned "prepayment credits are depleted"**, so chat shows a model-error notice | Top up Gemini credits |
| "Seen before" matcher (deterministic, per space) → "reported N days ago" + escalation | **Live, verified** via API for Pitch Area (works without the model) | — |
| Answer from records when the model is missing/failing (open match → escalate, resolved fix, FAQ, else offer ticket) | **Live**, labelled "built only from this space's records" | — |
| FAQ presets (`/api/spaces/:id/faq`): frequent issues from Agent Memory, fallback to Core reports, + operator FAQs | **Live** (currently from Core reports — run "Seed Agent Memory" to switch to memory) | Memory seed |
| Escalation card: tap-to-call / mailto / external portal link from the space settings | Wired. The bot never dials or emails itself | — |
| `/admin/spaces`: space context, equipment + safe steps, FAQs, escalation contacts, portal mode, NFC chip UIDs | Wired (operator secret). Saves to Core + writes a profile fact to Agent Memory | Durable Core |
| Approvals (HMAC-bound `actionId`) → create incident / portal update | Wired, not clicked through in the UI yet | — |
| SurrealDB Core: incidents, action attempts, audit, `/api/demo/reset` | Wired. **Running on the labelled `local` store**: not durable, and not shared between Vercel instances | `SURREALDB_URL/USERNAME/PASSWORD` |
| `/demo/maintenance` portal | Reads/writes Core; status chips + note + "Save update" | — |
| Anchor portal update + read-back verification | Wired, never run live | Durable Core, `ENABLE_ANCHOR_ACTIONS=true`, deploy |
| NFC chip (NTAG 424 DNA) | **Chip written** with SIGNAL dataset. Verifier + `POST /api/tap/redeem` + `nfc:check` exist and are unit-tested. Chip UIDs can now be linked to a space in `/admin/spaces` (env `NFC_TAGS` still wins); `/api/chat` trusts the signed session's location | Phone test; `/t` still shows the simulation screen (not calling `redeem` yet) |
| ElevenLabs cues | Generator script + chat playback with captions. **No audio generated** | API key needs `text_to_speech` permission |
| Phoenix traces | Spans for chat / recall / LLM / policy / tools | `PHOENIX_COLLECTOR_ENDPOINT` + `PHOENIX_API_KEY` |
| Daytona | **Live:** `npm run daytona:smoke` → fresh sandbox, `npm ci`, typecheck, NFC tests all pass | — |
| Vercel | https://signal-three-iota.vercel.app (GitHub-connected). Latest commit **not pushed yet** | Push |
| Outbound maintenance call (ElevenLabs agent + Twilio) | **Not started**, flag `ENABLE_OUTBOUND_CALLS=false` | See priorities |
| Pip mascot | Placeholder capsule, 6 states + text labels | Art |

Rule: only show behaviour that actually runs. Seeded/simulated data is labelled.

## Plan and next steps (in priority order)

**P0 — the demo doesn't work without these.**

1. **Gemini credits.** Top up at ai.studio. Then retest S1–S4 in the chat.
2. **SurrealDB Core instance.** Create a Surreal Cloud (or self-hosted) DB and set `SURREALDB_URL`, `SURREALDB_USERNAME`, `SURREALDB_PASSWORD` in `.env.local` + Vercel. The app seeds Room 204 on first read. Then `POST /api/demo/reset`. This also unblocks Anchor and makes NFC replay protection durable.
3. **Push + deploy**, then check `/api/health` on the phone over cellular.
4. **NFC on the phone** (chip already written):
   1. TagWriter → Read tags twice → `e`/`c` must change.
   2. `npm run nfc:check -- "<url from the chip>"` → note the `uid`.
   3. Paste the UID into **`/admin/spaces` → Pitch Area → NFC chips** (or set `NFC_TAGS=<UID>=pitch_area`), and set `NFC_MODE=verified` in `.env.local` + Vercel. Redeploy.
   4. Wire `src/app/t.tsx` to `useTapRedeem` (exact code in `docs/10_NFC_SETUP.md` §4) and pass `r.sessionToken` as the chat's `session` param — chat already resolves it via `/api/spaces/resolve` and `/api/chat` already trusts its location.
   5. Tap with the phone → should land in chat with "Secure NFC scan checked". Tap again with the old URL → `replayed`.
5. **Anchor live run on Vercel.** Set `ENABLE_ANCHOR_ACTIONS=true`, run S1 to step 4, watch the live view, confirm VERIFIED + evidence. If the agent struggles with the RN-web form, adjust the prompt in `src/lib/anchor.ts` (not the success logic).

**P1 — what judges look at.**

6. **Phoenix**: set the collector env, run one chat turn, keep the trace URL for the pitch.
7. **ElevenLabs cues**: give the key `text_to_speech` permission (or make a new key), `npm run cues`, commit `public/audio/*`. About 5 minutes.
8. **Test matrix** S1–S4 + `docs/06` checklist; record a backup demo video.
9. **Daytona story**: `npm run daytona:smoke -- --serve` for a live preview URL from a sandbox.

**P2 — only if P0/P1 are done.**

10. Pip art (6 states), reduced-motion check.
11. **Outbound call (Twilio + ElevenLabs agent).** Needs: a Twilio number imported into ElevenLabs (`ELEVENLABS_AGENT_PHONE_NUMBER_ID`), a configured agent (`ELEVENLABS_AGENT_ID`) that discloses it is a bot, one opt-in number (`DEMO_APPROVED_PHONE_E164`), human approval, cooldown, never 911. The policy gate already blocks calls until all of that exists.

### Should we do Twilio / ElevenLabs calls now?

**Not yet.** The call isn't part of any target prize (SurrealDB, Anchor, Daytona). It adds a second vendor, a phone number, and the riskiest side effect in the app. Project rule 12 says to cut it first. Voice cues are different: they're a 5-minute key fix and add charm, so they're in P1. Start calls only after S1 runs end to end on a phone with a real chip, durable Core and a verified Anchor update.

## Quick start

```bash
npm install
cp .env.example .env.local      # then fill values (file is gitignored)
npm run web                     # http://localhost:8081  (API routes work in dev)
npm run typecheck
```

Useful scripts:

| Command | What it does |
|---|---|
| `npm run smoke:memory` | Write + recall one sourced fact in Agent Memory |
| `npm run build:web && npm run serve` | Production-like build (what Vercel runs) |
| `npm run nfc:check -- "<chip url>"` | Verify a chip's SUN URL locally |
| `npm run test:nfc` | NFC verifier unit tests |
| `npm run cues` | Generate Pip's 5 voice cues into `public/audio` |
| `npm run daytona:smoke [-- --serve]` | Clean-room install + checks in a Daytona sandbox |

Operator-only endpoints (header `x-demo-secret: <DEMO_OPERATOR_LOGIN_SECRET>`):

```bash
curl -X POST https://<host>/api/memory/seed -H "x-demo-secret: …"   # Room 204 history into Agent Memory
curl -X POST https://<host>/api/demo/reset  -H "x-demo-secret: …"   # restore demo reports in Core (?spaces=1 also resets space profiles)
curl https://<host>/api/audit -H "x-demo-secret: …"                  # recent audit events
```

## Stack

| Layer | Choice |
|---|---|
| App | **Expo SDK 58 + Expo Router** (React Native + web), `web.output = "server"` so `src/app/api/**` are real server routes |
| Hosting | **Vercel** — `expo export -p web` → static client + `api/index.js` serverless handler |
| Memory | **SurrealDB Agent Memory** (`@surrealdb/memory`) — knowledge + provenance |
| Operational DB | **SurrealDB Core** (`surrealdb`, `src/lib/core.ts`) — authoritative incidents, action attempts, audit |
| LLM | Vercel AI SDK + **Gemini 3.8 Flash**, thinking `medium` (`src/lib/agent/model.ts`) |
| Browser agent | **Anchor Browser** REST (`src/lib/anchor.ts`) — only our `/demo/maintenance`, verified by Core read-back |
| Voice | ElevenLabs cached cues; outbound calls off |
| Dev sandbox | **Daytona** (`scripts/daytona-smoke.mjs`) |
| Tracing | Arize **Phoenix** (`src/lib/tracing.ts`, OpenInference span kinds) |
| NFC | NTAG 424 DNA SUN/SDM verifier (`src/lib/nfc/*`, `POST /api/tap/redeem`) |

## Repo layout

```
src/app/                       Expo Router screens + API routes
  t.tsx                        NFC landing (GET never consumes a scan)
  s/[session].tsx              visitor chat with Pip (approvals, incident + action cards, cues)
  admin.tsx                    integration status board
  admin/spaces.tsx             operator portal: space context, FAQs, escalation, NFC chips
  demo/maintenance.tsx         owned demo portal (Anchor's only allowed target)
  api/chat+api.ts              safety gate → recall + Core → Gemini decision → policy gate
  api/incidents+api.ts         visitor-approved ticket creation
  api/actions/*                Anchor portal update + read-back verification
  api/portal/tickets*          portal read/write (Core)
  api/tap/redeem+api.ts        NFC SUN verification → signed session
  api/spaces*                  space profiles (public/operator), resolve, FAQ presets
  api/health, audit, feedback, demo/reset, memory/seed
src/lib/                       server-only: env, memory, core, anchor, approvals, tracing, nfc/, agent/
src/design/                    UI design system (owned by the UI session)
src/data/demo-spaces.json      Pitch Area (default) + Room 204 profiles, Pitch Area past reports
src/data/demo-fixtures.json    synthetic Room 204 history + scenarios S1–S4
scripts/                       smoke-memory, nfc-check, gen-cues, daytona-smoke
docs/                          spec 01–10, playbook
```

## Secrets

Real keys live only in `.env.local` (gitignored) and Vercel env vars. They are temporary hackathon keys — rotate after the event. Nothing is prefixed `EXPO_PUBLIC_`; every integration is called from `src/app/api/**`.
`.mcp.json` reads `AGENT_MEMORY_ENDPOINT` / `AGENT_MEMORY_API_KEY` from the **system** environment (Claude Code does not read `.env.local`).
Note: `.gitignore` contains `.env*`, which also matches `.env.example`. It stays tracked because it's already committed. If you ever re-add it, use `git add -f`.

## Deploy

Pushing to `main` deploys to Vercel (project `signal`). Every var in `.env.example` must exist in Vercel (Production + Preview). `MAINTENANCE_PORTAL_BASE_URL` must be the public `/demo/maintenance` URL, because Anchor runs in the cloud.
