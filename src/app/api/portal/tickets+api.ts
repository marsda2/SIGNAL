import { coreBackend, listIncidents } from '@/lib/core';

/** GET /api/portal/tickets — the demo maintenance portal's own read API (backed by Core). */
export async function GET() {
  try {
    return Response.json({ backend: coreBackend(), tickets: await listIncidents() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
