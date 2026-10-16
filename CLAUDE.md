@AGENTS.md

## Claude Code notes

- Dev: `npm run web` (API routes included). Verify with `npm run typecheck` and `npm run smoke:memory`.
- Production-like: `npm run build:web && npm run serve`.
- `.mcp.json` expands `${AGENT_MEMORY_ENDPOINT}` / `${AGENT_MEMORY_API_KEY}` from the system environment, not `.env.local`.
- Before touching Agent Memory, Anchor, Daytona or ElevenLabs SDK calls, read the installed `.d.ts` — these SDKs changed during 2026 and old tutorials are wrong.
- Report what is genuinely live vs. simulated at the end of each slice (mirror the table in README).
