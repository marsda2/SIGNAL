# 06 — Setup plan, development workflow and 5.5-hour execution

## Before starting the clock (if allowed by event rules)

Prepare accounts/keys without prebuilding submission code: Daytona, Vercel, SurrealDB Cloud/Agent Memory, Anchor Browser, an LLM provider, Arize Phoenix, ElevenLabs and optionally Twilio. Read event rules about prior work/allowed templates and attribution. Charge NFC-enabled phone, bring genuine tags, reliable hotspot/cable, and a second phone to answer a preapproved demo call. Do not promise that a tag is configured until tested.

## A. Create the repository

```bash
npx create-next-app@latest signal --typescript --tailwind --eslint --app --src-dir
cd signal
npm install ai @ai-sdk/openai zod surrealdb @surrealdb/memory anchorbrowser \
  @arizeai/phoenix-otel @arizeai/phoenix-evals lucide-react motion
npm install -D vitest @playwright/test
```

`@ai-sdk/openai` may be swapped for another model provider. Check installed SDK versions before copying AI SDK code from old tutorials. `surrealdb` = operational SurrealDB Core SDK; `@surrealdb/memory` = separate Agent Memory client.

## B. SurrealDB Cloud / Agent Memory

1. In SurrealDB Studio, create one **Core database instance** for transactional operational records (check instance credentials from the console). Use a demo namespace/database (e.g. `signal`, `demo`).
2. In **Agent Memory**, deploy a distinct context (`signal-dev`); capture its exact context host, context ID and scoped API key.
3. Create a scope for `org/signal/site/demo/location/room204` in Scopes / CLI **before writing** scoped facts.
4. Test an official `remember`/`recall` call from Node using `@surrealdb/memory`. Confirm facts appear in Workbench/graph and original source references survive.
5. Seed Core with a conference room, Epson-style projector, Wi-Fi router, two historic incidents, an active HDMI incident, one technician-confirmed resolution and one approved test maintenance contact. Use synthetic info.
6. Never store private telephony credentials, tag AES secrets or a real visitor's personal information in Agent Memory.

**Fail-fast test:** ask “What happened previously with the Room 204 projector?” If there is no reproducible, sourced answer, fix memory integration before building the admin graph.

## C. Daytona development sandbox

Daytona offers cloud sandboxes for development and tests; the current official TypeScript package is `@daytona/sdk` (note: some outdated guides show `@daytonaio/sdk`). Use the Daytona console/SDK to provision a Node-capable sandbox, clone your Git repo and run `npm install; npm run dev -- --hostname 0.0.0.0`. Expose port 3000 via Daytona's signed preview URL or token-authenticated preview link. Store API credentials in sandbox secrets; do not write real keys into the repository.

**Daytona prize angle:** reproducible sandbox development, automated integration smoke tests, isolated sandbox reset after intentionally corrupting an incident record. Do not invent production relevance just to use it.

## D. Vercel deployment

1. Import the Git repo into Vercel.
2. Set environment variables for Development/Preview/Production as appropriate.
3. Use `export const runtime = 'nodejs'` for crypto/DB/telephony operations; confirm chosen libraries are supported by the hosting runtime.
4. Deploy HTTPS domain; NFC tags must point to the eventual working HTTPS URL.
5. Check that URL redemptions and API routes work on **the public phone's cellular connection**, not just localhost or a developer preview.
6. If a long browser/call operation may exceed function limits, return `PENDING` and complete through a durable background worker/webhook, or use a demo portal optimized for short execution. Do not depend on a web request holding open indefinitely.

## E. Anchor Browser

1. Create an Anchor API key; install `anchorbrowser`.
2. Use a configured browser session and authenticated profile for **your own** `/demo/maintenance` portal, not a third-party customer account.
3. Test a single task: find incident T-102, update priority or add a comment, submit, then read status back.
4. Embed `live_view_url` read-only in admin/presenter view, never expose a privileged interactive view to anonymous visitors.
5. On completion close/expire sessions; persist only essential evidence and outcome, not full sensitive browser recordings.

SDK interfaces evolved during 2026; use installed package types and official docs to adapt exact `sessions` and `tools` invocation. See references.

## F. Arize Phoenix

1. Open/create a Phoenix project `signal-hackathon`.
2. Install `@arizeai/phoenix-otel`, set `PHOENIX_COLLECTOR_ENDPOINT` and (if required) `PHOENIX_API_KEY`.
3. Register tracing in the Node server startup/instrumentation entry, trace `agent.classify`, `memory.recall`, `policy.evaluate`, `anchor.action`, `portal.verify` and `call.request`.
4. Add at least four labeled evaluation fixtures: self-service fix, duplicate report, real escalation and unsafe hazard.
5. Print/show one trace ID on the admin dashboard to demonstrate visibility and evidence for the judges.

## G. ElevenLabs audio and telephony

**Mascot cues:** Generate **five** natural, friendly voice lines once via ElevenLabs TTS (console or API), normalize volume, export to `public/audio/`, and preload the most relevant welcome sound. On mobile, wait for tap/interaction before playback. This means audio cue playback has no per-use synthesis charge (hosting/network costs remain).

**Visitor microphone:** For MVP, keep the text input first; optionally use Web Speech API if supported or ElevenLabs Scribe to transcribe a few seconds of user input. Use permission prompts and text fallback; do not require voice.

**Outbound demo:** Create/authorize a test Twilio number in ElevenLabs Agent setup; configure an outbound-capable ElevenLabs agent and agent phone number ID, and call **only an allowlisted phone owned by the team** when a judge/operator approves. Endpoint is `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call` with `agent_id`, `agent_phone_number_id`, `to_number` and `xi-api-key` header. Verify agent provisioning prerequisites, phone constraints, and provider webhook signatures in your account. Mark call as `initiated` until actual call status is known.

## H. NTAG 424 DNA

1. If tag is already SUN/SDM configured, decode/verify against NXP specification and test before staging the demo.
2. If blank, provisioning from scratch may be the largest blocker. Allocate a strict 30–40 minute checkpoint. If no genuine cryptographic verification, keep NFC as a *navigation-only demo tag* and label `verification_simulated`; do not fake the security property.
3. The Vercel app can still run complete agent/Anchor/voice flows using a demo session.

## Core secrets (`examples/env.example`)

- `OPENAI_API_KEY` (or chosen model provider)
- `SURREALDB_URL`, `SURREALDB_NAMESPACE`, `SURREALDB_DATABASE`, `SURREALDB_USERNAME`, `SURREALDB_PASSWORD`
- `AGENT_MEMORY_ENDPOINT`, `AGENT_MEMORY_CONTEXT_ID`, `AGENT_MEMORY_API_KEY`
- `ANCHORBROWSER_API_KEY` (confirm alias `ANCHOR_API_KEY` in your SDK)
- `PHOENIX_COLLECTOR_ENDPOINT`, `PHOENIX_API_KEY`
- `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_AGENT_PHONE_NUMBER_ID`
- `APP_SESSION_SECRET`, `NFC_KEY_STORE_REF`, `DEMO_OPERATOR_LOGIN_SECRET`
- `DEMO_APPROVED_PHONE_E164`, `MAINTENANCE_PORTAL_BASE_URL`

All are server-only, never prefixed with `NEXT_PUBLIC_`. Only publish harmless brand/feature flags. Rotate secrets after hackathon if shown or accidentally captured on screen.

## 5.5-hour sprint plan (relative to start)

| Phase | Minutes | Deliverable | Cut if blocked |
|---|---:|---|---|
| 0 — Deploy skeleton, demo seeded data | 0–35 | Real HTTPS visitor + fake portal | Fancy hero |
| 1 — Memory and operational incidents | 35–105 | Sourced recall, create/link incident | Full graph visualization |
| 2 — Chat & deterministic policy | 105–165 | End-to-end GUIDE / LINK / CREATE | Microphone |
| 3 — Anchor Browser automation | 165–220 | Live view and verified ticket update | Third-party integrations |
| 4 — NFC + visual mascot | 220–265 | Tag demo + 5 states | Fancy 3D rig; use SVG |
| 5 — Arize and telephony | 265–305 | Trace + optional approved demo call | Calls if not safe/ready |
| 6 — Reliability and pitch | 305–330 | Rehearsed 3-minute live demo + recorded backup | All non-core scope |

**Critical path:** basic functional chat → sourced memory → one real side effect → verified state → demo. The physical chip and the phone call add dramatic payoff only when the underlying flow is honest and reliable.

## Mandatory test matrix

```text
[ ] GET /t doesn't consume a scan
[ ] first valid SUN redemption works, second same read fails
[ ] shared stale URL can't create a second verified session
[ ] unverified QR fallback cannot use higher-privilege actions
[ ] user selects Room 204 but cannot access Room 205 tenant records
[ ] retrieved guide shows source and date; stale guide ignored
[ ] 'HDMI issue' resolved with guidance, no ticket
[ ] user says guidance failed -> existing incident found, no duplicate
[ ] no existing incident -> create exactly once, with read-back
[ ] Anchor browser changes one allowed field, status actually persisted
[ ] injection text in fake portal cannot change allowed action/target
[ ] call request requires human approval and matches allowed number
[ ] call failure produces 'not confirmed', not 'staff notified'
[ ] unsafe report displays safety handoff; no DIY and no auto-911
[ ] all modes work with keyboard and text; sound is optional
[ ] provider outage leaves graceful error or pending state
[ ] tagged demo data can reset without changing real records
```

## Live demonstration fallback strategy

- **Primary:** physical tag → phone → streamed chat → stored memory → Anchor live browser → confirmed incident.
- **If NFC fails:** manually enter demo room from a clearly labeled `Demo Mode` button; do not misrepresent simulated validation.
- **If voice fails:** type the same visitor request; short cached voice cues remain optional.
- **If Anchor is down:** show recorded browser run as a **recording**, not as live execution; preserve actual Core incident demo.
- **If telephony fails:** show approved call attempt status; do not claim reception.
- **Always:** have a prerecorded 90-second end-to-end video that is transparently presented as backup.
