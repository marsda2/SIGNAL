import { z } from 'zod';

import { ConfigError } from '@/lib/env';
import { redeemTap } from '@/lib/nfc/redeem';
import type { TapResponse } from '@/lib/nfc/types';

export const dynamic = 'force-dynamic';

// Body is the original SDM query as the chip produced it: either { e, c } or the raw search string/URL.
const Body = z.union([
  z.object({ e: z.string().max(64), c: z.string().max(32) }),
  z.object({ raw: z.string().max(2048) }),
]);

// Tiny per-instance limiter so a flooded endpoint is cheap to refuse (docs/03 threat table).
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

/** POST /api/tap/redeem — the only place a scan is consumed. Never GET. */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (limited(ip)) {
    return Response.json({ status: 'rate_limited', message: 'Too many scans. Wait a minute and tap again.' } satisfies TapResponse, { status: 429 });
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });

  const raw = 'raw' in parsed.data ? parsed.data.raw : `?e=${parsed.data.e}&c=${parsed.data.c}`;
  try {
    const result = await redeemTap(raw);
    // Audit line: status + pseudonymous outcome only. No keys, no raw URL.
    console.info(JSON.stringify({ evt: 'nfc.redeem', status: result.status, at: new Date().toISOString() }));
    return Response.json(result, { headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
  } catch (e) {
    const notice = e instanceof ConfigError || (e instanceof Error && e.message.includes('APP_SESSION_SECRET'));
    return Response.json(
      { error: notice ? 'not_configured' : 'redeem_failed', detail: notice && e instanceof Error ? e.message : undefined },
      { status: notice ? 503 : 500 },
    );
  }
}
