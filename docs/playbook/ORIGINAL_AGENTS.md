# SIGNAL — AI coding agent operating instructions

You are implementing SIGNAL. Read `README.md` and `docs/01..08` before architectural changes. Prioritize a **working end-to-end vertical slice** over beautiful but disconnected screens.

## Product contract

The visitor taps a place-specific NFC chip, opens a responsive web chat with the Pip mascot, receives source-aware troubleshooting, and can approve a ticket update or an operator-defined maintenance escalation. The assistant has real, scoped memory and always distinguishes observed from confirmed outcomes.

## Coding rules

1. Use TypeScript, Next.js App Router, React, Tailwind, Zod and the chosen AI SDK.
2. Keep all API keys and NFC keys server-side; no key under `NEXT_PUBLIC_`.
3. Separate SurrealDB **Core** (authoritative incidents) from **Agent Memory** (knowledge). Agent Memory official TS client is `@surrealdb/memory`. Read its installed types and official docs before calling.
4. Tool calling must go through a deterministic policy gate, be idempotent, and log audit attempts. Never let LLM output pick arbitrary URL/phone number or set its own success flag.
5. Real SUN/SDM verification only when a provisioned tag and tested crypto verifier exist. Otherwise enable visible `DEMO / NFC simulation` mode. GET `/t` must not consume a one-time scan.
6. Use an owned maintenance demo portal as Anchor Browser's allowlisted target. Confirm updates with a read-after-write, not just a click success.
7. ElevenLabs voice cues are cached files. Outbound calls are off by default, must target only a pre-approved opt-in demo number, need human approval, and must disclose bot identity. Never call 911 automatically.
8. Always render text equivalents for audio and emotions. Mascot must not obstruct chat on mobile; honor reduced motion.
9. Show evidence source/time, pending/error states, and accurate verification copy. Don't hallucinate incident facts.
10. Use Arize tracing for important spans but do not substitute LLM eval scores for permission enforcement.
11. Use deterministic test fixtures with reset action; make replayable demo scenarios.
12. If scope must be reduced, cut call > animated extras > admin analytics before cutting memory + Anchor verified browser action.

## Implement in this order

A. Deploy blank Next.js + test `GET /t` and `/demo/maintenance`.
B. Seed Room 204, projector, prior issue and an active incident in SurrealDB Core.
C. Implement scoped memory retrieval with official SDK and source data.
D. Make chat GUIDE/LINK/CREATE branches actually work.
E. Use Anchor Browser to update and verify one test ticket, then show live view.
F. Add Pip's 5 states and cached clips.
G. Add NFC verifier (only if tag provisioned), Arize spans and optional approved demo call.
H. Run full tests, prepare 3-minute presentation, record truthful backup demo.

## Definition of done

The visitor sees a correctly named room, a memory-grounded fix, follows one question, either marks it solved or obtains an *actually persisted* incident result, with visible status and evidence. A judge can see Anchor operate the portal and can inspect one Arize trace. Every destructive/external side effect requires permission and a logged verified outcome.

## Avoid

- Unsupported guessed SDK endpoints or fake provider responses.
- “Verified presence” or “human notified” copy without evidence.
- Leaking secret query params to analytics/referrers.
- Parallel repeated calls to the same maintenance phone.
- Importing AGPL Avatar Lab code into a commercial closed-source repo without license review.
