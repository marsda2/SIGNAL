import { flags, integrationConfig } from '@/lib/env';
import { memory } from '@/lib/memory';

export const dynamic = 'force-dynamic';

/** GET /api/health — which integrations are configured, plus a live Agent Memory liveness probe. */
export async function GET() {
  const configured = integrationConfig();
  let agentMemory: { ok: boolean; error?: string } = { ok: false, error: 'not configured' };
  if (configured.agentMemory) {
    try {
      await memory().health();
      agentMemory = { ok: true };
    } catch (e) {
      agentMemory = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return Response.json({ app: 'SIGNAL', time: new Date().toISOString(), configured, flags, live: { agentMemory } });
}
