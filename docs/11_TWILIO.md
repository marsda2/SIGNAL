# 11 — Twilio outbound call (REQUEST_MAINTENANCE_CALL)

Direct Twilio Programmable Voice, no ElevenLabs agent in the loop. (The playbook's ElevenLabs+Twilio path is still possible later; this is the simpler, fully verifiable version.)
Reference: https://www.twilio.com/docs/voice/tutorials/how-to-make-outbound-phone-calls

## Flow

1. `/api/chat` offers a **Maintenance call** approval only when: the ticket exists and is unresolved, the report is **not** a hazard, `ENABLE_OUTBOUND_CALLS=true`, Twilio is configured and `DEMO_APPROVED_PHONE_E164` is set.
2. The visitor taps approve → `POST /api/actions/call` with an HMAC `actionId` bound to `MAINTENANCE_CALL + location + ticket` (30 min TTL).
3. Server policy, in order: valid approval → calls enabled → Twilio configured → destination is **only** `DEMO_APPROVED_PHONE_E164` (E.164) → ticket belongs to the location → no in-flight call for the ticket → **10 min cooldown per ticket**.
4. Twilio `Calls` REST (`TwiML` inline). The script opens with "automated call from SIGNAL, an AI assistant, placed with a visitor's approval", repeats the ticket and summary once, and never promises dispatch. Visitor text is XML-escaped and capped at 200 chars.
5. State machine (`action_attempts`, kind `MAINTENANCE_CALL`): `PENDING → INITIATED` (Twilio accepted — *not* delivered) → `VERIFIED` only when Twilio reports `completed` with duration > 0 (evidence text says the message was played and **nobody acknowledged**) → `FAILED` for busy / no-answer / failed / canceled / 0-second.
6. Outcome sources: `POST /api/webhooks/twilio/status` (needs public HTTPS + `TWILIO_AUTH_TOKEN` for `X-Twilio-Signature`), and `GET /api/actions/:id`, which polls Twilio (works on localhost).
7. Audit events: `action.call.requested | initiated | failed | rejected`, `webhook.twilio.status | rejected`. Only the last 4 digits of the destination are logged.

## Setup

1. Twilio Console → buy a voice-capable number. **Trial accounts can only call verified numbers** and play a trial preamble — verify the demo phone under Phone Numbers → Verified Caller IDs.
2. Fill `.env.local` (and Vercel env): `TWILIO_ACCOUNT_SID`, `TWILIO_PHONE_NUMBER`, either `TWILIO_AUTH_TOKEN` or `TWILIO_API_KEY`+`TWILIO_API_SECRET`, `DEMO_APPROVED_PHONE_E164` (a phone the team owns and has opted in), then `ENABLE_OUTBOUND_CALLS=true`.
3. Keep `TWILIO_AUTH_TOKEN` set even if you use an API key: it is the only key that signs webhooks. Without it the webhook rejects everything and status comes from polling only.
4. Status callbacks are sent only when a public origin is known (`PUBLIC_BASE_URL`, or `VERCEL_PROJECT_PRODUCTION_URL` on Vercel). On localhost none are sent.
5. Rotate the Auth Token after the hackathon.

## Verified / not verified

- Verified: TypeScript compiles; signature validation accepts a correct HMAC and rejects tampered params, wrong URL and wrong token (round-trip test; the algorithm follows Twilio's docs but I did not check against a Twilio-issued vector).
- **Not verified:** any live call. No Twilio credentials were available when this was written. First live run must be done by the team with the approved phone in hand.
- Not built: inbound calls, DTMF acknowledgement (`<Gather>`) that would let "staff acknowledged" be marked honestly, recording (off on purpose — no consent flow), per-space phone numbers (the allowlist is a single env number by design).
