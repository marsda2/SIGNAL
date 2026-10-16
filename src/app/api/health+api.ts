import { modelId } from '@/lib/agent/model';
import { coreHealth } from '@/lib/core';
import { flags, integrationConfig } from '@/lib/env';
import { memory } from '@/lib/memory';
import { tracingEnabled } from '@/lib/tracing';

export const dynamic = 'force-dynamic';

/** GET /api/health — which integrations are configured, plus live Agent Memory + Core probes. */
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
  const core = await coreHealth();
  return Response.json({
    app: 'SIGNAL',
    time: new Date().toISOString(),
    configured,
    flags,
    model: modelId(),
    live: { agentMemory, core, tracing: { ok: tracingEnabled(), error: tracingEnabled() ? undefined : 'PHOENIX_COLLECTOR_ENDPOINT not set' } },
  });
}
