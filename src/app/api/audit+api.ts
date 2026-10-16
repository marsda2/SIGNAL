import { coreBackend, recentAudit } from '@/lib/core';
import { isOperator } from '@/lib/env';

/** GET /api/audit — operator-only recent audit events from Core. */
export async function GET(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  return Response.json({ backend: coreBackend(), events: await recentAudit() });
}
