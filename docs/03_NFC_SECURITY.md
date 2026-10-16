# 03 — NTAG 424 DNA: physical interaction, verification, and security

## What the chip provides

NXP NTAG 424 DNA supports AES-128 cryptography and Secure Unique NFC (SUN) messaging / Secure Dynamic Messaging (SDM). Correctly provisioned, its ordinary NDEF URL can include read-dependent cryptographic data that a backend can authenticate. It is stronger than a static QR because copied static text cannot mint fresh authenticated readings.

**Precise security statement:** A verified SUN/SDM message is evidence that the corresponding chip generated a valid message at some read-count state. It does **not** independently prove the reporter's physical presence, device identity or time of tap. A fresh-looking, previously unseen URL could have been pre-collected and held; a real URL could be relayed. The chip's read counter is *not a trusted timestamp*.

## Physical deployment

- Label: `SIGNAL` logo, NFC icon, “Tap for help in this room” and fallback accessible QR/instruction. Avoid promising identity/location proof.
- Put tags where a user can reach them, ideally clearly associated with a single space or asset.
- For prototypes, attach to a tabletop card. For pilots, mount inside tamper-evident housing; consider NXP **TagTamper** if physical seal tamper status matters.
- The tag is mapped to one `location_id` or `asset_id` in the operator-admin console; do not encode privileged admin rights in its URL.
- A photographed QR fallback leads to *informational* assistance or an unverified-report workflow; make verified and fallback status visible.

## Provisioning checklist — not a copy-paste crypto recipe

1. Acquire genuine, configurable NTAG 424 DNA tags, appropriate mobile NFC reader/writer, and NXP-compatible provisioning software/library.
2. Record the chip identifier / application identity (as allowed by SDM configuration); generate **unique per-tag AES keys** using a secure key store. **Change factory default keys**; never put keys in NFC URLs, client JS, or Agent Memory.
3. Configure NDEF with HTTPS URL pointing to `https://<your-domain>/t?...`; configure SDM/SUN offsets, mirrored encrypted identifier and read counter as needed, and message authentication according to your chosen AN12196 setup.
4. Set key-management and permissions correctly; protect management operations, and write/tag-lock only after validating behavior and recovery procedure.
5. Test multiple sequential taps on at least two phones; collect two URLs and ensure backend verification succeeds and the dynamic fields differ.
6. Test copy/replay rejection; confirm whether browser previews or NFC preview fetches trigger GETs before user confirmation.
7. Register `key_ref`, `location_id`, provisioning profile/version, and activated status in the operational database.
8. Rotate/revoke keys with documented procedures if compromised or tag removed; for public spaces arrange operator consent and maintenance.

NXP documentation: product page and technical application note **AN12196**, plus datasheet **NT4H2421Gx** (see references).

## Secure redemption flow

```text
Phone reads NDEF URL
  → GET /t?{chip SDM fields}
  → Render lightweight landing (no privileged action on GET)
  → Visitor taps "Continue" (or equivalent deliberate submit)
  → POST /api/tap/redeem with original SDM fields
  → Backend validates expected field format and resolves tag/key_ref
  → Verify authenticated SDM message using vendor-defined AES/CMAC scheme
  → Atomically compare/consume counter and claim hash (anti-replay)
  → Check tag enabled, organization/location active, rate limits
  → Mint short-lived signed visitor session limited to this location
  → Redirect to /s/{opaque-session}; strip dynamic URL from browser history
  → Continue to chat
```

### Why GET must be side-effect free

Mobile browsers, link previews, email clients and security scanners can prefetch GET URLs. If GET consumes a counter, a legitimate tap may appear already used. **Redemption should be an explicit POST**. Do not assume user requests always preserve query parameters across redirect. Use `Referrer-Policy: no-referrer` and reduce query leakage via analytics or third-party assets.

### Verification design (security-critical)

- **Do not implement homemade crypto** from abbreviated pseudocode. Match exact NXP SDM configuration, diversified key scheme if used, CMAC derivation/input, encodings, offsets and encrypted PICC data in a vetted test-vector implementation.
- Decode and authenticate tag-specific fields server-side; constant-time authentication-tag comparison; reject unknown/unprovisioned tags.
- Store per-tag last accepted counter and *consumed counter/claim* records in the operational DB. Use an atomic transaction / compare-and-swap, not naive read-then-write susceptible to races.
- Check for counter regressions; decide policy for out-of-order taps (simple hackathon implementation: accept only strictly increasing counter, with warning that concurrent reading can cause an earlier tap to be rejected).
- Use an expiring, limited-scope session token with no phone or admin permissions attached. `httpOnly`, `Secure`, appropriate `SameSite`, and CSRF/origin controls for browser actions.
- Record verification `verified | replayed | invalid | unconfigured | fallback`, the tag ID (or pseudonymous mapping), counter, and time of *server redemption*. No unnecessary raw tag secrets in logs.
- If verification cannot be completed, offer useful non-privileged help but clearly label the session **Unverified scan** and restrict privilege/evidence weight.

### Important subtlety: counter ≠ freshness clock

Setting a 60-second session lifetime only limits actions **after redemption**. SUN/SDM alone does not prove the scanned URL was produced less than 60 seconds earlier, because a never-redeemed valid URL might be stockpiled. For stronger actual-presence evidence, add challenge–response with device capabilities that can interact securely with the chip, supervised reader hardware, or independent contextual checks appropriate to the risk. For SIGNAL's low-risk issue triage, an authenticated/unused read plus abuse controls is a useful but bounded signal.

## Threat model and controls

| Threat | Mitigation / honest limitation |
|---|---|
| Screenshot or copied static QR | Does not generate authenticated 424 DNA SDM reads; QR fallback has lower confidence |
| Reuse redeemed NFC URL | Atomic counter/hash redemption rejects replay |
| Share current unused URL | Still possible; cannot attribute person to physical visit |
| Save many unused valid URLs | Counter monotonicity/revocation may mitigate, not fully solve |
| Tag physically stolen/relocated | Tamper-evident mounting, device inventory, regular checks; TagTamper variant where applicable |
| Two people scan nearly together | Transactional counter arbitration and friendly retry; avoid claiming fraud without evidence |
| Automated flooding of reports | Rate limits by tag/session/IP where appropriate, clustering, moderation and anti-spam |
| Malicious prompt injection in location description | Treat all external text as untrusted; fixed tool and policy boundaries |
| Access a different organization's issues | Scope every API by tenant, location and role in operational DB; never trust a client-provided tenant ID |
| Bot calls many phone numbers | Strict phone allowlist + explicit approval + cost limit + repeat suppression |
| Forged provider callbacks | Verify authenticated webhook/signature per provider docs and idempotently process events |

## Authorization model

**Visitor capability:** Ask, view public equipment instructions, file one bounded report about that location, and see safe status. No access to raw internal memory, private tickets, phone numbers, or incident history of other locations.

**Operator:** Authenticated org admin can edit assets, set incident rules, configure contacts, confirm resolutions, inspect audit records.

**Technician:** Authenticated repair role can update incident status and confirm fix; its source is distinguished from casual user report.

**External browser agent:** Service identity restricted to one allowlisted portal and narrow maintenance operations. No permission to visit arbitrary domains or interact with customer payment/account services.

## Public-sector and safety constraints

Any deployment on an NYC train or bus platform requires the transit operator's permission and accessible, safe placement. Do not represent SIGNAL as an official MTA service unless authorized. For safety events (track intrusion, fire, injury, electrical hazard), never queue a normal AI ticket or initiate an unsupervised emergency call: show emergency/human assistance instructions immediately and route to staff under a reviewed policy.

**Hackathon fallback:** Use the real chip only when provisioned and verified. If your tag is blank or provisioning fails, present a *clearly disclosed simulated verification badge* while keeping chat, memory and actions fully functional. Do not misleadingly advertise a static tag as authenticated SUN.
