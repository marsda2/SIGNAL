import { resetDemo } from '@/lib/core';
import { isOperator } from '@/lib/env';

/** POST /api/demo/reset — operator-only: restore Room 204 fixtures in Core (audit log is kept). */
export async function POST(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    return Response.json(await resetDemo());
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
