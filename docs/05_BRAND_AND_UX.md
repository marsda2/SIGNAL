# 05 — Brand kit, UX, mascot and voice guidelines

## Naming and positioning

**Brand:** SIGNAL (uppercase in marks; “Signal” in prose if readability needs it)

**Descriptive category:** Place-aware AI operations assistant

**Primary tagline:** **Every space has a memory.**

**Product CTA:** **Tap. Ask. Resolve.**

**Supporting line:** **A little help, exactly where you need it.**

**Business value:** **Resolve problems before they become tickets.**

**Future vision:** **Tap anything. It knows how to help.** (aspirational, not a claim of universal coverage)

Don't claim to be an official NYC transit, hospital or emergency service. Reserve SIGNAL as a working name until trademark/domain clearance.

## Personality

**90% trustworthy technician, 10% adorable companion.** SIGNAL should feel helpful rather than childish, friendly without being overly familiar, capable without pretending omniscience. Professional operations teams must take it seriously; visitors should feel comfortable asking “stupid” questions.

### Voice principles

| Do | Avoid |
|---|---|
| “I found a fix that worked here yesterday.” | “I know exactly what’s wrong.” |
| “Let's try one quick check.” | “You probably configured it incorrectly.” |
| “That didn't solve it. Would you like me to report it?” | “Don't worry, I fixed it.” |
| “I submitted a request; nobody has confirmed it yet.” | “Help is on the way!” without evidence |
| “I can’t verify that information right now.” | “100% verified” unless it genuinely is |
| “Please stop using the outlet and alert staff.” | DIY hazardous repair instructions |

**Style:** plain American English default; support Spanish in a future pass; 1–3 short sentences per reply; one question at a time; specific equipment names; no unexplained acronyms; no excessive emojis. Use reassuring but concise language. Humor can appear in idle state but not for injury, hazards or repeated failures.

### Copy snippets

- Landing: **“Need help in Conference Room 204?”** / **“Ask about the equipment or report a problem.”**
- Verified: **“NFC scan authenticated”** / tooltip “The chip generated a valid message. This does not identify the person who scanned it.”
- Unverified: **“Location not verified. You can still ask for help.”**
- Welcome: **“Hey there! I'm Pip. Need a hand with something in this room?”**
- Working: **“Checking what happened here before…”**
- Evidence: **“A similar projector issue was resolved yesterday by switching to HDMI 1.”**
- Checkpoint: **“Did that fix it?”** / **“Yes, it works” · “Still broken” · “Not sure”**
- Existing report: **“Someone has already reported this. Ticket T-102 is being reviewed.”**
- Action ask: **“I can report this to the maintenance team. Would you like me to?”**
- Call ask: **“This looks time-sensitive. I can call the approved maintenance line. Shall I?”**
- Called, not answered: **“The call was initiated. I'm waiting for its outcome.”**
- Confirmed: **“Maintenance acknowledged the request.”**
- Hazard: **“Please stop using that equipment and alert staff now.”**

## Visual system (distinct from Backsoon)

**Direction:** approachable editorial utility. Quiet, spacious, tangible, moderately playful; not gamer neon, cyberpunk, or crypto dashboard.

### Color tokens

| Token | Hex | Use |
|---|---|---|
| `ink` | `#192831` | Headlines, dark backgrounds, UI text |
| `signal` | `#D5FF72` | Hero accent, CTA, mascot detail, success celebration (not the sole status color) |
| `sea` | `#2C766C` | Supporting accents, trust state |
| `paper` | `#F7F8F4` | Main app background |
| `surface` | `#FFFFFF` | Cards, chat assistant bubbles |
| `muted` | `#617077` | Descriptions, metadata |
| `line` | `#E2E7E4` | Dividers/borders |
| `alert` | `#C55236` | Urgent states and errors; always pair with text/icon |
| `warning` | `#E2B157` | Pending/high priority; text contrast checked |

Avoid automatically using the same green/dark-green feel as Backsoon; SIGNAL should read as a separate company. White/off-white visitor interface; dark ops panel optional. Use CSS custom properties and ensure WCAG contrast for text on lime.

### Typography

- **Primary:** `Manrope` (headings 600–800, body 400–600) for a rounded but credible visual tone. Fall back `Inter`, `system-ui`, sans-serif.
- **Numeric/operational:** tabular numerals in dashboard; no decorative monospace beyond tiny code/IDs.
- **H1:** 34–40px desktop / 28–32px mobile. Body 15–16px, line height 1.5. Labels 12–13px minimum where possible.
- **Copy:** sentence case; not uppercase paragraphs; avoid long center-aligned text on mobile.

### Logo concept

Simple wordmark **SIGNAL** with a compact circular beacon/spark mark: two offset arcs around a dot, subtle spatial cue that resembles both “tap” and “help requested.” The mark must work in black and white and at 24px. Do not rely on an NFC symbol as the entire logo (generic and hardware-limited).

### Space tags

A 50–70 mm square or 4x6 in tabletop stand in off-white, with icon/wordmark at top, small mascot eyes, obvious NFC target circle, headline “Tap for help,” location name, and fallback short URL/QR labeled as lower-assurance access. Pilot placement rules take priority over branding.

## Mascot: PIP, the on-site helper

**Name:** Pip (optional character alias; SIGNAL remains product name). A lightweight, 2D-ish capsule/bean with off-black body, oversized white eyes, tiny subtle mouth for empathy, and signal-lime micro-accent. Consistent silhouette across expressions; no arms needed for MVP.

**Behavior:** calm, subtle float (2–4 px vertical), occasional blink and pupil motion; hover near chat header and never cover message text, submit button, or OS keyboard. Respect reduced-motion preference. When mobile keyboard opens, shrink to a 28–36 px avatar icon.

| State | Trigger | Expression/motion | Audio (cached) |
|---|---|---|---|
| `idle` | Welcome / done | Friendly open eyes, slow blink | `hello.mp3`: “Hey! How can I help?” |
| `listening` | Mic active | Lean in, pupil tracking/audio meter | None |
| `thinking` | Memory/tool query | Look upward, tiny dots, slow sway | `checking.mp3`: “Hmm, let me check that.” |
| `helping` | Showing safe steps | Focused, gentle nod | `try-this.mp3`: “Let's try something.” |
| `solved` | User confirms solved or action actually verified | Eye crescents + small bounce | `nice.mp3`: “Nice! Glad that worked.” |
| `escalating` | Escalation about to run | Concerned eyes, no frantic motion | `on-it.mp3`: “I'll help get this reported.” |

**Important:** The final two states have specific triggers. Do not play a success phrase just because the LLM predicted success. Never play “Help is on the way” before a verified acknowledgment.

### Avatar Lab implementation

Candidate authoring/reference project: `smontlouis/bible-strong-avatar-lab`. It exports `.avatar.json`, procedural SVG/React renderer, expressions and animation timelines. The repository uses **AGPL-3.0**, including network-service/source-availability requirements depending on how its components are used. For a commercial closed-source app, review legal implications or reimplement a minimal original SVG/CSS renderer rather than copying licensed code.

**MVP-friendly option:** Make original SVG body and eyes in a 1-component React file with Motion/CSS; 5 eye presets and two easing curves. Less integration/licensing complexity; potentially faster than learning the entire Avatar Lab ecosystem. Keep internal face data as arrays of pupil positions/eye openness, not video assets.

### Motion tokens

- Standard easing: `cubic-bezier(.2,.8,.2,1)`; transitions 180–320ms.
- Idle float: 3px, 3.2s ease-in-out loop; blinking 130ms at irregular 4–8s intervals (avoid timers on server render).
- Solved bounce: 280ms, one pass; no confetti storms.
- Thinking: tiny 3-dot wave; announce actual step with text.
- Chat enters in 160ms with very small translation; never delay content behind animation.
- `prefers-reduced-motion`: disable floats, facial tracking, bounce, and parallax.

## UI information architecture

### Mobile visitor web app

**Landing `/t`:** site/room name, secure scan state, `Continue` CTA, notice about no account, alternative access text.

**Chat `/s/[session]`:** sticky slim header with Pip and room, connection/status indicator; mascot enlarged for first message then collapses; message feed; evidence chips (“Resolved yesterday · Technician note”); quick action chips; fixed bottom composer with microphone/submit; status card for browser/call activity.

**Completion:** short outcome receipt (“You solved this” / “Ticket opened T-104” / “Existing issue: T-102”) and optional `Was this helpful?` feedback.

### Desktop admin

**Overview:** active locations, incidents by state, common issues, self-service resolution share, escalations awaiting approval.

**Location details:** name + NFC deployment status; tags and scan count; assets + approved instructions; known recurring issues; ordered memory timeline with source and verification; calls/maintenance integrations.

**Incident view:** facts, reports, agent suggestions, policy decision and escalation audit, Anchor live view for an *operator*, technician confirmed resolution control.

### Demo presenter view

On one desktop screen, split 40/60: narrow mirrored phone chat on left, **live Anchor Browser** or SurrealDB graph/Arize trace on right. Physical chip sits next to the phone. Presenter can switch one tab between browser, provenance graph, and trace. Keep the entire demo to 3 minutes.

## Accessibility and privacy by design

- Visitor interaction works without camera permissions, microphone, account or app install.
- Provide text alternative to every microphone-only action and every pre-recorded phrase.
- Avatar never conveys meaning through eye expression alone; visible labels announce states.
- Do not autoplay audio before a user gesture; allow mute; show transcript/captions for all voice cues.
- Minimum 44×44px touch targets where possible; visible keyboard focus; screen-reader-compatible streaming announcements without flooding the live region.
- Session-limited data. Explain when a report is saved. Avoid storing raw voice unless necessary, and clearly request consent if call recording is enabled.
- Prefer “We've received your report” to unsupported promises about staffing timelines.
