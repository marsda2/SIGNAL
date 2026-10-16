# 09 — Expo + Vercel stack decisions (deviations from the playbook)

The playbook (docs/01–08) specifies Next.js App Router. We build on **Expo Router (SDK 58)** and host on Vercel instead, so the same codebase can later ship as a native app (e.g. NFC background tag reading) while the NFC → web chat flow works today.

## Translation table

| Playbook (Next.js) | This repo (Expo) |
|---|---|
| `app/t/page.tsx` | `src/app/t.tsx` |
| `app/s/[session]/page.tsx` | `src/app/s/[session].tsx` |
| `app/admin/page.tsx` | `src/app/admin.tsx` |
| `app/demo/maintenance/page.tsx` | `src/app/demo/maintenance.tsx` |
| `app/api/chat/route.ts` | `src/app/api/chat+api.ts` |
| `app/api/tap/redeem/route.ts` | `src/app/api/tap/redeem+api.ts` (todo) |
| `export const runtime = 'nodejs'` | default — the Vercel adapter runs the Node.js runtime |
| `process.env` in route handlers | same; Expo CLI loads `.env.local` for server routes in dev |
| Tailwind | RN `StyleSheet` + tokens in `src/constants/tokens.ts` |
| `NEXT_PUBLIC_*` | `EXPO_PUBLIC_*` — **still forbidden for secrets** |
| `lib/…` | `src/lib/…` (alias `@/lib/…`) |

## Vercel wiring

- `app.json`: `web.output = "server"` → `expo export -p web` produces `dist/client` (static) and `dist/server` (API routes + SSR bundle).
- `vercel.json`: builds with `npx expo export -p web`, serves `dist/client`, rewrites everything else to `api/index.js`, which calls `createRequestHandler` from `expo-server/adapter/vercel` and includes `dist/server/**` in the function.
- Env vars: set the same names as `.env.example` in Vercel (Production/Preview). Long Anchor/call work must return `PENDING` and finish via webhook/job; function `maxDuration` is 60 s.
- Verified locally: `npm run build:web && npm run serve`, then `/api/health`, `/api/memory/seed`, `/api/chat` all respond. **Not yet verified on Vercel itself.**

## Agent Memory notes

- Host + context id are per SurrealDB Studio context. This repo currently points at the context used by the Scouty playground (`AGENT_MEMORY_CONTEXT_ID` in `.env.local`) — **create a dedicated `signal-dev` context** before the demo so Scouty data doesn't mix in. Our reads filter with `labels: ['location=room204']`.
- Scopes (`org/signal/site/demo/location/room204`, docs/06 §B.3) are the right long-term isolation mechanism; they must be registered before writing. We use labels until that is done. Test `lens`/`scopeView` semantics against `memory.d.ts` when switching.
- Supersession: write the new fact, keep the old one, and link them with an explicit event/relation (triples) rather than `forget()`. Not implemented yet.
- Seeded demo facts are labelled `demo=true` and their text starts with `SOURCE: demo-fixtures (synthetic …)`.

## Open decisions

1. LLM provider: wired for Anthropic (`ANTHROPIC_API_KEY`); swap in `src/app/api/chat+api.ts` if using OpenAI.
2. Streaming: `/api/chat` currently returns a typed-event JSON batch. Move to SSE/UI-message streaming when the loop is stable (don't copy old `toDataStreamResponse()` snippets; check `ai@7` types).
3. NFC: a native Expo build could read tags directly, but the hackathon path is the tag's URL → `/t` on web. SUN/SDM verification still needs a provisioned NTAG 424 DNA (docs/03).
4. Avatar licensing: Pip is an original placeholder; do not import AGPL Avatar Lab code.
5. Twilio is only needed through ElevenLabs' native Twilio integration for outbound calls; keys are blank until that is set up.
