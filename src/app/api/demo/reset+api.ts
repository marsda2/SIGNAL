import { resetDemo } from '@/lib/core';
import { isOperator } from '@/lib/env';

/** POST /api/demo/reset[?spaces=1] — operator-only: restore demo incidents (and optionally space profiles) in Core. */
export async function POST(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    return Response.json(await resetDemo({ spaces: new URL(request.url).searchParams.get('spaces') === '1' }));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
