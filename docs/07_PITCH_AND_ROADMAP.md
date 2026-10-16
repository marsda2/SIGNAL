# 07 — Pitch, hackathon judges, milestones and go-to-market

## The story to tell

Don't start with vendor logos. Start with a familiar shared frustration, demonstrate a physical tap, then reveal memory and action. The NFC tag is the tangible hook; the real moat is the memory/verification/action loop.

### Opening hook (spoken English)

> “Quick question: who here has ever waited for a train that never arrived? Or been in a library where the Wi-Fi, power outlet, or projector didn't work?”
>
> “Now, how many of you knew exactly who to ask—or whether somebody had already reported it?”
>
> “Physical spaces have problems. But they don't have memory, and they don't know how to help.”
>
> “Meet SIGNAL. We give every physical space an AI assistant you can summon with a tap.”

Use transport as an everyday reference, but **demo the conference-room projector**. The mismatch is not fatal if the transition is explicit: “We started with meeting rooms and libraries. This technology could eventually help stations, venues and hotels—with operator approval.”

## 3-minute live pitch run of show

| Time | Action | What it proves |
|---|---|---|
| 0:00–0:20 | Raise-hand question; introduce SIGNAL | Relatable problem; memorable tagline |
| 0:20–0:40 | Tap 424 DNA tag; show specific room and smiling Pip | Physical context, NFC verification (if genuine) |
| 0:40–1:15 | “The projector won't show my laptop.” Pip searches history, suggests known HDMI fix | Contextual retrieval, troubleshooting, approachable UI |
| 1:15–1:35 | Visitor says it still doesn't work; duplicate or unresolved issue detected | Independent decision and institutional memory |
| 1:35–2:10 | Agent uses Anchor Browser to update existing ticket in owned portal; operator sees live browser | Genuine external tool action with verified result |
| 2:10–2:30 | Show provenance timeline in SurrealDB + one Arize trace | Responsible reasoning, source freshness, evaluation |
| 2:30–2:45 | Optional: operator approves call; demo phone rings; agent identifies itself | Human handoff; optional differentiator |
| 2:45–3:00 | Vision and closing line | Impact and scale |

**Closing:** “Today, we gave this room a voice, a memory, and the ability to act. Imagine what happens when every physical space has one.”

**Alternative shorter close:** “SIGNAL. Every space has a memory.”

## If outbound call is a key moment

Use a separate phone held by a team member. Show the approval button *before* the call, use an opt-in test number, and have the ElevenLabs agent say:

> “Hello. I'm SIGNAL, an automated facilities assistant. I'm calling about an unresolved projector issue in Conference Room 204. A presentation is scheduled soon. Our standard checks didn't resolve it. Can you acknowledge the report?”

Only announce “acknowledged” after the human actually confirms it. If nobody answers, the correct status is “Call attempted; no acknowledgment yet.”

## Defensible technical story for the judges

- **Impact:** reduces friction for visitors and potentially unnecessary support tickets; expands self-service to physical environments.
- **Creativity:** physical context and secure tag + expressive assistant + institutional memory + AI tool use, unlike a QR form.
- **Execution:** complete tap-to-verified-action loop, demonstrable replay check, status transitions and test cases.
- **Presentation:** live tagged prop and phone, mirrored visitor chat, split-screen Anchor browser, visible evidence trail.

**Sponsor fit:** SurrealDB Agent Memory is substantive when facts have provenance and supersession. Anchor Browser is substantive when it changes an owned portal and verifies the change. Arize is substantive when you display traces/evaluations linked to an actual run. ElevenLabs is substantive when you use cached mascot audio and—if safe—a live, approved support call. Daytona is substantive when it supports repeatable development/test environments. Do not force every integration at the expense of a stable demo.

## What NOT to pitch

- “We have verified the visitor's precise location/identity” (not guaranteed by SUN).
- “Our AI automatically calls emergency services” (not safe or appropriate).
- “We've partnered with the MTA” without a signed partnership.
- “No more maintenance people are needed” (reframing staff is better).
- “We always know how to fix equipment” (memory may be wrong or outdated).
- “We can integrate with any portal” unless you have tested those integrations.

## Future product milestones

### Stage 1 — Conference rooms / university libraries (weeks 1–4)

Facilities pilot with one site, 5–20 rooms, operator-verified equipment catalog, diagnosis scripts, NFC provisioning workflow, staffed escalation policy, usage and false-positive measurement.

### Stage 2 — Multi-location operations (months 2–3)

Tenant admin, verified resolution publishing workflow, role-based access, external ticketing API-first connectors (e.g. tools with legitimate integrations), on-call schedules, technician mobile dashboard, incident dedup analytics, auditable SLAs and incident lifecycle.

### Stage 3 — Facilities automation (months 3–6)

Memory transfer for identical equipment across locations, multilingual voice/text, automated authorized portal actions when API not available, maintenance document ingestion, smart escalation rules and human acceptance tracking.

### Stage 4 — Transportation/public infrastructure (later; partnerships required)

Official real-time transit feeds with freshness and source labeling, operator-supplied station maps and accessibility information, consented tag installs, government procurement/security requirements, emergency interaction model designed jointly with transit authorities.

## Revenue experiments (hypotheses, not validated prices)

- **Starter:** annual/quarterly site license with a small number of rooms, self-service only.
- **Operations:** price per active location or seat with analytics, maintenance connectors, assisted onboarding.
- **Enterprise:** SSO, audit retention, privileged portal integrations, incident workflows and service-level commitments.
- **Costs to measure:** NFC hardware/provisioning/install, embeddings and agent inference, memory recall, Anchor browser time, Arize traces, telephony minutes, support time, customer onboarding and equipment documentation.

## Priority decisions after the sprint

1. Do visitors resolve problems faster than with a QR form/printed instructions?
2. Do operators trust AI-proposed categorization and merge decisions?
3. What portion of incident histories actually contains reusable, verified knowledge?
4. Does SUN verification measurably reduce spam/false reports in the chosen risk model?
5. Will a facility pay for fewer repetitive support tickets and faster turnaround?

## Names to test

- Product: **SIGNAL** (working title)
- Mascot: **Pip** (friendly short name, but not required in B2B marketing)
- Operator product: **SIGNAL Ops**
- Hardware: **SIGNAL Tap**
- AI-layer feature: **Place Memory**

Run standard trademark/domain screening before commercial launch.
