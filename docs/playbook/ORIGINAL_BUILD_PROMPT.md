# Copy this into your coding agent (Claude Code, Codex, Cursor, etc.)

Build SIGNAL from the specifications in this repository. Start by reading README.md and AGENTS.md, then docs/02_SYSTEM_ARCHITECTURE.md, docs/04_AGENT_MEMORY_AND_EVALUATION.md, docs/05_BRAND_AND_UX.md, and docs/06_SETUP_AND_HACKATHON.md.

Create a mobile-first Next.js App Router application with a real functional end-to-end demo:

- Room 204 seed data: projector + Wi-Fi; two resolved incidents and one open issue.
- `/t` safe NFC landing (no consume-on-GET); support a clearly labeled demo fallback.
- `/s/[session]` animated Pip mascot with `idle/listening/thinking/helping/solved/escalating`, accessible chat, mic optional, 5 cached ElevenLabs cues optional.
- An AI agent that classifies/answers/suggests safe troubleshooting, retrieves memory with provenance from SurrealDB Agent Memory using `@surrealdb/memory`, and creates or links incidents in operational SurrealDB Core.
- Admin panel + demo maintenance portal that Anchor Browser can operate. Show `live_view_url` to operator, verify changes with read-after-write.
- Rule-based policy checks, per-action approval, allowlisted portal/maintenance phone, audit events, no automatic emergency calling.
- Arize Phoenix traces with 4 scenario evals; show trace ID and a readable events timeline.
- Deploy to Vercel from a Daytona sandbox; preserve secrets outside repository.

First implement a thin working vertical slice and report what is genuinely live. Do not mock provider success silently. If credentials are unavailable, use explicit simulation labels and keep adapters replaceable. Work in short, testable checkpoints and keep a demo reset action. Do not tackle all edge cases before the first successfully persisted ticket.

Use the brand palette and writing tone in `docs/05_BRAND_AND_UX.md`. The user-facing chat must feel effortless; enterprise admin must look operational and credible. Optimize the primary live demo for a 3-minute jury presentation.
