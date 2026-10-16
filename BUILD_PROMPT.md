# Prompt for the next coding-agent slice (Claude Code, Codex, Cursor…)

Continue building SIGNAL in this repo. First read `README.md`, `AGENTS.md`, `docs/09_EXPO_STACK.md`, then `docs/02_SYSTEM_ARCHITECTURE.md`, `docs/04_AGENT_MEMORY_AND_EVALUATION.md`, `docs/05_BRAND_AND_UX.md`, `docs/06_SETUP_AND_HACKATHON.md`. The stack is **Expo Router + Vercel** (not Next.js); API routes live in `src/app/api/**/*+api.ts`.

Already live: Agent Memory write/recall (location-scoped by label), `/api/health`, safety gate in `/api/chat`, placeholder Pip, simulated NFC landing, read-only demo portal. Do not rebuild these.

Build the next slice from `AGENTS.md` → Roadmap, in order, stopping after each checkpoint to report what is genuinely live:

1. SurrealDB Core (`surrealdb` SDK): seed Room 204 + incidents T-100/T-101/T-102, tag→location map, `action_attempts`, append-only `audit_events`, a reset action. Make `/demo/maintenance` read/write Core so an update can be verified by read-after-write.
2. Chat branches GUIDE / LINK_EXISTING / CREATE_INCIDENT using `DecisionSchema` and `authorizeProposedAction`; create exactly once with read-back; no duplicate when T-102 already matches.
3. Anchor Browser: update one field on T-102 via the owned portal, read it back, show `live_view_url` to the operator only. Gate with `ENABLE_ANCHOR_ACTIONS`.
4. Pip 6 states (SVG/Animated, reduced-motion aware) + 5 cached ElevenLabs cues in `public/audio`.
5. Phoenix spans and the four eval fixtures (S1–S4 in `src/data/demo-fixtures.json`).

Rules: no mocked provider success; label simulated/seeded data; keys server-side only; never edit `src/design/**` without asking; keep the demo to 3 minutes. Add Daytona-based smoke tests if time allows.
