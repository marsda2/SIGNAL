# 08 — Verified references, assumptions and corrections

**Verified against public documentation on 2026-10-16.** Provider UIs/SDK signatures, limits, billing and hackathon rules can change; check the linked references before implementation.

## Correction to the supplied SurrealDB playbook

The supplied example used `@surrealdb/agent-memory` and HTTP `/v1/remember` / `/v1/recall`. Current official SurrealDB documentation identifies:

- **Package:** `@surrealdb/memory` (`AgentMemory` class).
- **API:** `POST /api/v1/{context}/facts` and `POST /api/v1/{context}/query` on the exact context host.
- **Constructor:** `{ endpoint, context, apiKey }`.
- **Methods:** `remember(text, options)` and `recall(query, options)`.
- **Scopes:** register hierarchical paths before use; check enabled API privileges.

The submitted `supersedesId` and generic `metadata` properties must **not** be copied uncritically as known supported SDK parameters. The desired time/provenance behavior is valid, but implementation must follow the actual schema and use explicit trusted event records for confirmed supersession where needed.

Official docs:
- [Agent Memory TypeScript SDK](https://surrealdb.com/docs/agent-memory/integrations/sdks/javascript-and-typescript)
- [Agent Memory SDK reference](https://surrealdb.com/docs/agent-memory/reference/sdk-javascript)
- [Hosted quickstart](https://surrealdb.com/docs/agent-memory/quickstarts/hosted)
- [SurrealDB Studio Cloud setup](https://surrealdb.com/docs/agent-memory/quickstarts/surrealdb-cloud)
- [REST API](https://surrealdb.com/docs/agent-memory/reference/rest-api)
- [CLI and scopes](https://surrealdb.com/docs/agent-memory/reference/cli)

## Anchor Browser

Official reference:
- [Browser UI live-view embedding](https://docs.anchorbrowser.io/quickstart/embed-browser-in-your-product)
- [Anchor Browser first automation](https://anchorbrowser.io/blog/getting-started-with-anchor-browser-your-first-automation-script)
- [Vercel AI SDK + Anchor integration](https://anchorbrowser.io/blog/vercel-ai-sdk-anchor-browser-agents-typescript)
- [Anchor Browser npm SDK](https://www.npmjs.com/package/anchorbrowser)
- [Authenticated browser profiles](https://docs.anchorbrowser.io/essentials/authentication-and-identity)

Use `live_view_url` in operator presentation and verify external actions via read-after-write. The SDK has evolved, with some docs showing different constructor styles; prefer types in the installed version and official current reference. Never hand browser admin credentials to public users.

## NFC / NXP

- [NXP NTAG 424 DNA overview / datasheet and AN12196](https://www.nxp.com/products/rfid-nfc/nfc-hf/ntag-for-tags-and-labels/ntag-424-dna-424-dna-tagtamper-advanced-security-and-privacy-for-trusted-iot-applications%3ANTAG424DNA)
- [NTAG 424 DNA datasheet NT4H2421Gx](https://www.nxp.com/docs/en/data-sheet/NT4H2421Gx.pdf)

NTAG 424 DNA has AES-128 and SUN authentication per read; actual message layout, CMAC verification and key provisioning depend on the tag's SDM configuration. Do not state the URL itself authenticates a human or establishes a reliable scan timestamp.

## Arize Phoenix

- [Phoenix product/documentation](https://arize.com/docs/phoenix/)
- [TypeScript SDK overview](https://arize.com/docs/phoenix/resources/typescript-api)
- [Custom OpenTelemetry spans and tracing](https://arize.com/docs/phoenix/tracing/how-to-tracing/setup-tracing/custom-spans)

Recommended packages: `@arizeai/phoenix-otel`, `@arizeai/phoenix-evals`, `@arizeai/openinference-core` as appropriate.

## ElevenLabs

- [Twilio outbound call endpoint](https://elevenlabs.io/docs/api-reference/integrations/twilio/outbound-call)

Official documented endpoint: `POST /v1/convai/twilio/outbound-call`; required fields include `agent_id`, `agent_phone_number_id`, and `to_number`. API success means dispatch, not confirmed human acknowledgment. Review recording consent, telephony rules and your account's configured agent/phone number prerequisites.

## Daytona / Vercel

- [Daytona current TypeScript SDK](https://www.daytona.io/docs/en/typescript-sdk/)
- [Daytona sandbox preview URLs](https://www.daytona.io/docs/en/typescript-sdk/sandbox/)
- [Vercel AI SDK + Anchor example](https://anchorbrowser.io/blog/vercel-ai-sdk-anchor-browser-agents-typescript)

Daytona is a sandbox for development and tests; Vercel deployment and SDK runtime configuration still need to be validated against current limits.

## Avatar licensing

- [Bible Strong Avatar Lab GitHub](https://github.com/smontlouis/bible-strong-avatar-lab)
- [README / export format](https://github.com/smontlouis/bible-strong-avatar-lab/blob/main/README.md)

The project is **AGPL-3.0**. A closed-source commercial product may need a legal review, a separate commercial license, or a fresh original renderer. Keep attribution and source obligations where applicable.

## Assumptions vs factual claims

**Product/design decisions (ours):** SIGNAL colors, tagline, screen design, role separation, policies, mascot name, use of SurrealDB Core operational tables, evaluation scenarios and KPI gates. They are specifications, not statements about third-party APIs.

**Requires implementation and testing:** real NFC provisioning and server verification; actual Anchor browser action against portal; ElevenLabs call configuration and webhook signature verification; real production-grade RBAC; durable jobs; Arize project initialization; purchased hardware; real-world feasibility/permitted placement in public infrastructure.

**Important:** This playbook provides architecture and example contracts; it does **not** mean a working SIGNAL application has already been coded, deployed, or connected to any provider account.
