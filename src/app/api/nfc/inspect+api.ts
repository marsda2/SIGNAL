import { isOperator } from '@/lib/env';
import { nfcMode } from '@/lib/nfc/config';
import { inspectTap } from '@/lib/nfc/redeem';

export const dynamic = 'force-dynamic';

/**
 * GET /api/nfc/inspect?e=...&c=...  (header x-demo-secret: DEMO_OPERATOR_LOGIN_SECRET)
 * Provisioning aid: decodes a tap WITHOUT consuming it, so an operator can read the chip UID to put in NFC_TAGS.
 */
export async function GET(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  const { search } = new URL(request.url);
  const { sun, locationId, factoryKeys } = inspectTap(search);
  return Response.json(
    { mode: nfcMode(), factoryKeys, result: sun.ok ? { ok: true, uid: sun.uid, counter: sun.counter, locationId: locationId ?? null } : sun },
    { headers: { 'cache-control': 'no-store' } },
  );
}
