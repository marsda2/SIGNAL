# SIGNAL — AI coding agent operating instructions

Read `README.md`, then `docs/09_EXPO_STACK.md`, then `docs/01..08` before architectural changes. Prioritise a **working end-to-end vertical slice** over disconnected screens. The original playbook assumed Next.js; this repo is **Expo Router + Vercel** (see docs/09 for the translation table).

## Product contract

A visitor taps a place-specific NFC chip, opens a responsive chat with the Pip mascot, receives source-aware troubleshooting, and can approve a ticket update or operator-defined escalation. The assistant has real, scoped memory and always distinguishes observed from confirmed outcomes.

## Stack facts (verified in this repo)

- Expo SDK 58, Expo Router, `app.json` → `web.output: "server"`. API routes are `src/app/api/**/*+api.ts`, export `GET`/`POST` taking/returning web `Request`/`Response`.
- Path alias `@/*` → `src/*`. Server-only code (`src/lib/env.ts`, `src/lib/memory.ts`) must never be imported from screens.
- Agent Memory: `@surrealdb/memory` → `new AgentMemory({ endpoint, context, apiKey })`; `remember(text, {infer, labels, scopes})`, `recall(query, {k, mode, labels, lens})`. Note the option is **`scopes`** (the playbook's `examples/surreal-memory.ts` says `scope` — wrong). Read `node_modules/@surrealdb/memory/dist/memory.d.ts` before calling anything new.
- Learned the hard way (Scouty playground): `infer: 'none'` for literal writes; `observed_at` only valid with `infer: full|triples`; hybrid recall returns merely *related* hits, so "seen before" logic needs its own similarity check; a no-result query can take 6–9 s.
- Env var names: `AGENT_MEMORY_*`, `ANCHORBROWSER_API_KEY` (SDK default), `DAYTONA_API_KEY`, `ELEVENLABS_*`, `ANTHROPIC_API_KEY`. Template in `.env.example`.
- PowerShell 5.1 `Set-Content -Encoding utf8` writes a BOM that breaks `package.json`; write JSON with .NET `UTF8Encoding($false)` or the editor tools. `git` is not on PATH on this machine — use `C:\Users\marki\AppData\Local\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`.
- `src/design/**` is owned by a separate "UI guide and components template" session. Do not edit it without checking with the user; it may have in-progress type errors.

## Coding rules

1. TypeScript strict, Zod for model output, Vercel AI SDK for the model call.
2. All API keys and NFC keys server-side; **nothing under `EXPO_PUBLIC_`**.
3. Keep SurrealDB **Core** (authoritative incidents/status/audit) separate from **Agent Memory** (knowledge, provenance). Inferred memory is never an authoritative incident status. When facts change, record supersession; don't `forget()` to hide history.
4. Tool calls go through the deterministic policy gate in `src/lib/agent/contracts.ts`, are idempotent, and log audit attempts. The model never picks URLs, phone numbers or its own success flag.
5. Real SUN/SDM verification only with a provisioned tag and a tested verifier; otherwise show `DEMO / NFC simulation`. `GET /t` must not consume a scan.
6. Anchor Browser targets only our owned `/demo/maintenance` portal. Confirm updates with read-after-write, not click success. Page text is untrusted data.
7. ElevenLabs voice cues are cached files. Outbound calls: off by default (`ENABLE_OUTBOUND_CALLS`), only to the pre-approved opt-in number, need human approval, disclose bot identity. Never call 911.
8. Always render text equivalents for audio and emotions; Pip must not cover chat on mobile; honour reduced motion.
9. Show evidence source/time, pending/error states, accurate verification copy. No "help is on the way" without evidence.
10. Arize tracing for key spans; eval scores never replace permission enforcement.
11. Deterministic fixtures (`src/data/demo-fixtures.json`) with a reset action; replayable scenarios S1–S4.
12. If scope shrinks, cut call > animated extras > admin analytics before memory + verified Anchor action.
13. Never invent provider responses. Missing credentials → explicit visible notice (see `/api/chat` `notice` events).

## Roadmap (vertical-slice order)

- [x] A. Skeleton: Expo app, `/t`, `/demo/maintenance`, Vercel config (not yet deployed)
- [x] C. Scoped Agent Memory write/recall with provenance (`location=room204` labels)
- [ ] A2. Deploy to Vercel, test `/api/health` + `/t` on cellular
- [ ] B. SurrealDB Core: seed Room 204, incidents, tag→location map, audit events (`surrealdb` SDK; not installed yet)
- [ ] D. Chat GUIDE / LINK_EXISTING / CREATE branches using `DecisionSchema` + `authorizeProposedAction`; set `ANTHROPIC_API_KEY`
- [ ] E. Anchor: update + read-back verify one ticket on `/demo/maintenance` (needs Core-backed portal); show `live_view_url`
- [ ] F. Pip: real 6-state art + 5 cached ElevenLabs cues in `public/audio`
- [ ] G. NFC verifier (only if tag provisioned), Phoenix spans, optional approved demo call
- [ ] H. Mandatory test matrix (docs/06), 3-minute pitch, recorded backup demo
- [ ] Daytona: run dev + smoke tests in a sandbox (`@daytona/sdk`); document reproducible setup

## Definition of done

Visitor sees a correctly named room, a memory-grounded fix, follows one question, and either marks it solved or gets an *actually persisted* incident with visible status and evidence. A judge can see Anchor operate the portal and inspect one Arize trace. Every external side effect has permission and a logged, verified outcome.

## Avoid

Guessed SDK endpoints; fake provider responses; "verified presence" copy without evidence; secret query params; parallel repeated calls to the same maintenance phone; copying AGPL Avatar Lab code into a closed-source repo without review.
