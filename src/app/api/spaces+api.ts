import { listSpaces } from '@/lib/core';
import { isOperator } from '@/lib/env';

/** GET /api/spaces — operator-only: full space profiles (incl. NFC links and contacts). */
export async function GET(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    return Response.json({ spaces: await listSpaces() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
