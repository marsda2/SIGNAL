# SIGNAL — Every space has a memory.

**Version:** 1.0 · **Date:** October 16, 2026 · **Format:** Hackathon-ready product, brand, architecture, and launch playbook

> **Tap. Ask. Resolve.**
>
> Give every physical space a contextual AI assistant that can diagnose, remember, guide, and—in safe, authorized circumstances—act.

## What SIGNAL is

SIGNAL is a **mobile-first contextual facilities assistant** accessed by tapping an NTAG 424 DNA NFC tag installed at a known location. The tap opens a lightweight web chat with a friendly animated mascot. The assistant knows the location, its equipment and operational instructions, recalls verified historical incidents, distinguishes confusion from genuine faults, tries safe troubleshooting, and either resolves, attaches to an existing incident, creates a new incident, or requests escalation.

The pitchable innovation is **not** “NFC + chatbot.” It is **a memory and action layer for the physical world**, with cryptographically authenticated tag reads, evidence-linked memories, repeatable policies, live browser automation, and optional human handoff by phone.

### Core loop

`PHYSICAL TAP → SERVER VERIFICATION → CONTEXTUAL CHAT → MEMORY RECALL → DIAGNOSE → GUIDE → CONFIRM → RESOLVE / MERGE / OPEN / ESCALATE → LEARN`

### Target users

- **Visitor:** public-space user, coworker, guest, library patron, event attendee, student or passenger; no app or account necessary for ordinary assistance.
- **Facility operator:** library, coworking operator, hotel, campus, conference organizer or small property team; installs tags and administers equipment, contact numbers and policies.
- **Maintenance technician:** receives actionable reports, confirms resolutions and updates authoritative knowledge.

### First market and demo

**Start with conference rooms and libraries**, because equipment issues are common, manageable, and safe to demonstrate. An NYC subway platform is a compelling *future concept*, not the live pilot; railway premises require operator authorization and transport information needs official data sources.

### One-sentence pitch

**“We give every room a memory and an AI technician you can summon with a tap.”**

## Scope boundaries

**Hackathon demo:** one physically presented NTAG 424 DNA tag (real SDM/SUN when configured), one room, two equipment items, three seeded incidents, a visitor chat, an operator portal, memory retrieval with provenance, one Anchor Browser action, optional approved test call, five cached mascot audio cues, Arize traces, and a deployed web demo.

**Not in the hackathon MVP:** complete SaaS multi-tenancy, billing, arbitrary external portal integrations, automatic dispatch to real emergency services, real MTA installation, location attestation stronger than the NFC protocol provides, autonomous handling of dangerous equipment, or dozens of custom voice responses.

## Architecture decisions

- **Frontend / API:** Next.js App Router + React + Tailwind + TypeScript on Vercel. Use a Node.js runtime for cryptography, SDKs and telephony webhooks; use streaming chat where possible.
- **Reasoning:** Vercel AI SDK + model provider. Deterministic policy engine constrains decisions and side effects.
- **Operational source of truth:** SurrealDB Core database for tags, places, assets, incidents, statuses, audit events and policies.
- **Semantic/institutional memory:** SurrealDB **Agent Memory** managed context for time-aware facts, provenance, and recall. Synchronize verified incident resolutions into memory; do not treat inferred memory as an authoritative incident status.
- **Agent browser:** Anchor Browser, restricted to allowlisted maintenance portal(s); use its live view to show automation.
- **Tracing / evaluation:** Arize Phoenix with OpenTelemetry/OpenInference and explicit outcome checks.
- **Voice:** cached ElevenLabs audio cues for mascot; optional ElevenLabs speech-to-text for microphone; approved outbound calls via ElevenLabs + Twilio as a demonstration of escalation, not an emergency response system.
- **Physical identity:** NXP NTAG 424 DNA configured with SDM/SUN; verified on backend with read counter/replay handling. Without provisioning, demo may use a clearly marked *simulated NFC verification* mode.
- **Development:** Daytona cloud development sandbox; push to Git and deploy Vercel. Daytona is *the development environment*, not a required always-on production service.

## Contents

| File | Purpose |
|---|---|
| `docs/01_PRODUCT_AND_SCOPE.md` | Personas, product requirements, flows, decisions, metrics, business case |
| `docs/02_SYSTEM_ARCHITECTURE.md` | System diagram, services, data model, API contracts, queues, failure modes |
| `docs/03_NFC_SECURITY.md` | NTAG 424 DNA provisioning plan, SUN/SDM verification, threats, permissions |
| `docs/04_AGENT_MEMORY_AND_EVALUATION.md` | Agent state machine, multi-agent responsibilities, provenance, SurrealDB memory, Arize |
| `docs/05_BRAND_AND_UX.md` | Visual identity, voice, mascot, responsive screens, motion and accessibility |
| `docs/06_SETUP_AND_HACKATHON.md` | Accounts, installation, secrets, milestones, kill switches, tests, demo script |
| `docs/07_PITCH_AND_ROADMAP.md` | Judge narrative, 3-minute pitch, variants, roadmap, pricing hypotheses |
| `docs/08_REFERENCES_AND_CORRECTIONS.md` | Verified official docs, API corrections and assumptions |
| `examples/env.example` | Environment-variable template, with no real secrets |
| `examples/agent-contracts.ts` | Zod decision schema, backend-enforced authorization semantics |
| `examples/surreal-memory.ts` | SurrealDB Agent Memory client example using official package |
| `examples/nfc-redemption.pseudo.ts` | Security-focused NFC claim pseudocode; not a crypto implementation |
| `examples/design-tokens.css` | Brand color, radius and reduced-motion tokens |
| `examples/demo-fixtures.json` | Synthetic Room 204 incidents and evaluation scripts |
| `AGENTS.md` / `BUILD_PROMPT.md` | Instructions for an AI coding agent |

## Repo layout to implement

```text
signal/
├── app/
│   ├── t/page.tsx                       # NFC landing, prefetch-safe
│   ├── s/[session]/page.tsx             # Mobile visitor assistant
│   ├── admin/page.tsx                   # Facilities dashboard
│   ├── admin/locations/[id]/page.tsx
│   ├── demo/maintenance/page.tsx        # Owned fake portal used by Anchor
│   └── api/
│       ├── tap/redeem/route.ts          # POST, cryptographic verification
│       ├── chat/route.ts                # Agent loop + streamed text/events
│       ├── incidents/route.ts           # Read authorized incident state
│       ├── actions/approve/route.ts     # Human approval for side effects
│       ├── escalations/call/route.ts    # Server policy + ElevenLabs dispatch
│       ├── webhooks/elevenlabs/route.ts
│       └── demo/reset/route.ts          # Admin-only for presentation
├── components/avatar/                   # Mascot state mapping
├── components/chat/
├── components/admin/
├── lib/agent/                             # Policy, planners, tools
├── lib/nfc/                               # Cryptographic verifier adapter
├── lib/db/                                # SurrealDB Core
├── lib/memory/                            # SurrealDB Agent Memory
├── lib/integrations/                      # Anchor, Arize, ElevenLabs
├── lib/auth/                              # Session, operator roles
├── public/audio/                          # Pre-generated 5 short voice cues
├── tests/                                 # Unit + end-to-end scenarios
└── docs/
```

## Definition of done (demo)

A judge can (1) tap or scan a legitimately configured tag, (2) see the correct room, (3) report an issue and get a grounded prior fix, (4) reject that fix, (5) watch Anchor update a real test portal, (6) see a persisted incident outcome with memory provenance and Arize trace, and (7) optionally answer a phone call dispatched to a pre-approved demo number after authorization. No hidden hardcoded success states.

**Non-negotiable:** Only demonstrate behavior that actually runs. Label seeded data, simulated reads, and synthetic incidents clearly.

---

See `docs/08_REFERENCES_AND_CORRECTIONS.md` for API verification and operational caveats. All provider schemas and pricing may change after this document's date.
