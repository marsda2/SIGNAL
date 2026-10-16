import { coreBackend, listDemoEmails } from '@/lib/core';
import { emailMode } from '@/lib/email';
import { isOperator } from '@/lib/env';

/** GET /api/demo/inbox — operator-only: emails SIGNAL "sent" in EMAIL_MODE=demo (stored in Core, nothing left SIGNAL). */
export async function GET(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  try {
    return Response.json({ mode: emailMode(), backend: coreBackend(), emails: await listDemoEmails() }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
