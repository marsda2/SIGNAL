# 01 — Product definition, positioning, and scope

## Mission

**Make physical spaces understandable, self-serving and responsive.** People should not have to discover which organization controls a broken projector, where the reporting form lives, or whether someone has already complained. A single touch reveals a context-aware helper that can resolve the easy cases and route the difficult ones responsibly.

## Promise and differentiation

| Conventional QR/NFC feedback form | SIGNAL |
|---|---|
| Visitor chooses location/category | Location and equipment catalog are already known |
| Generic FAQ | Relevant, sourced and time-aware issue memory |
| Immediately opens a ticket | Attempts safe diagnosis and solution first |
| Duplicates from every report | Correlates against active incidents |
| Disconnected help desk | Authorized agent can operate real maintenance portal |
| No learning loop | Technician-confirmed fixes improve subsequent guidance |
| No proof of chip interaction | NTAG 424 DNA SUN/SDM scan authenticity with honest limits |

## Jobs to be done

**Visitor:** “I am here, this thing doesn't work, and I need quick help without finding the right staff member.”

**Operator:** “Prevent avoidable tickets, make relevant knowledge available on site, know what is really broken, and reach staff only when it matters.”

**Technician:** “Receive a concise diagnostic trail and equipment context instead of vague duplicate complaints.”

## First deployable verticals

1. **Library / university rooms (MVP):** display/projector, Wi-Fi, outlets. Demonstrable, lower operational stakes, short diagnosis trees.
2. **Coworking and conference rooms:** AV equipment, booking-room support, facility issues.
3. **Hotels:** room-specific concierge and maintenance, with privacy and identity safeguards.
4. **Events:** location-aware support, workshop availability, facility issues and optional approved networking.
5. **Public transit (future):** station/andén instructions, accessibility or fault reporting only with operator agreements and trusted, current information. Emergency escalation stays out of AI-driven workflows.

## Visitor journey

1. Notice small, branded stand: “Need help in this room? Tap here.”
2. Tap NFC. Mobile browser opens `signal.<domain>/t?...`.
3. Landing shows site/room, “Secure NFC scan checked” only if cryptographic verification succeeded, and optional “Continue” to redeem. No user login for ordinary reports.
4. A compact animated mascot greets: “Hey there! How can I help?” Text chat, push-to-talk mic, and quick prompts are visible.
5. User describes issue. Agent searches current site instructions and past verified resolutions; cites a specific example internally and renders a natural-language summary with uncertainty.
6. Agent proposes one safe, simple fix; asks “Did that work?” (Solved / Still broken / Not sure).
7. If solved, registers resolution with provenance and user feedback. Does not mark a physical asset repaired unless confirmed by an authorized actor.
8. If unresolved, checks for an already-active related incident; either attaches a corroborating report or proposes creating/escalating an incident.
9. For authorized high-priority non-emergency escalation, asks for confirmation and contacts the configured channel. Phone outreach is a gated option, not a default side effect.
10. Visitor sees traceable status (“Reported,” “Existing issue,” “Maintenance contacted,” “Unable to verify”). Never falsely claims help is on the way.

## Decision outcomes

| Outcome | Trigger | User feedback | State change |
|---|---|---|---|
| `GUIDE` | Safe, documented local fix is likely | Short, clear steps | Troubleshooting attempt event |
| `ANSWER` | Product/room question, not a fault | Cited explanation | Optional FAQ/feedback |
| `RESOLVED_SELF_SERVICE` | User says it works | Celebration, closure | User-reported resolution + learning candidate |
| `LINK_EXISTING` | Matching current ticket found | Existing ticket status | Attach report; no new ticket |
| `CREATE_INCIDENT` | Fault persists; no match | “Report this issue?” | New incident after policy/approval |
| `ESCALATE_URGENT` | Priority rule and authorized staff contact | Explicit expected response | Approved escalation; no emergency calls |
| `SAFETY_HANDOFF` | Smoke, person on tracks, exposed live wiring, injury, etc. | Stop unsafe troubleshooting; contact appropriate human/emergency resources | Minimal safety log; no autonomous emergency dispatch |
| `ASK_CLARIFY` | Low confidence, unclear asset or location | One targeted question | No side effects |

## Product non-goals

- Diagnosing hazardous infrastructure or offering risky repair instructions.
- Guaranteeing someone is physically present solely from a tag URL.
- Performing unlimited autonomous calling or SMS.
- Treating past chat memories as verified incident states.
- Allowing users to overwrite official equipment knowledge.
- Recording a person's name, phone or voice by default.
- Deploying in public infrastructure without approval.

## Value and KPI hypotheses

**Primary KPI:** proportion of non-dangerous issues *confirmed resolved without staff intervention*. Secondary: duplicate ticket avoidance; mean time to acknowledgment; staff minutes saved per issue; user-rated helpfulness; agent false-success rate; incident handling latency; repeated faults per asset; escalation precision.

Early commercial model to explore (not validated): base fee per location/site + usage or active-location tiers, with premium browser/phone integrations. Avoid precise pricing until the costs of location onboarding, telephony, hardware and facility support are measured.

## Pilot success criteria

- >= 80% of scripted safe requests correctly classified in 10 predefined scenarios (hackathon gate; not a production benchmark).
- 100% of unsafe scenarios avoid DIY repair and automatic emergency calls.
- No duplicate ticket after two repeated reports of one issue.
- No unapproved outbound call.
- Replayed NFC claim rejected in a real cryptographic test.
- One confirmed resolution becomes retrievable with its timestamp and source.
- End-to-end demo completes in < 3 minutes under normal network conditions.

## Trust language

Say **“authenticated chip read”** or **“verified NFC interaction”** when applicable. Do not say **“GPS-proof presence,”** “identity verified,” or “guaranteed physically here.”

For real transit deployments, separate SERVICE INFORMATION (official or clearly timestamped) from USER REPORTS (unconfirmed). This prevents collective reporting from being mistaken for official operating status.
