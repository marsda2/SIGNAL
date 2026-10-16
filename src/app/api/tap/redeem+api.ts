import { z } from 'zod';

import { ConfigError, isOperator } from '@/lib/env';
import { diagnoseTap, type TapDiagnosis } from '@/lib/nfc/diagnose';
import { redeemTap } from '@/lib/nfc/redeem';
import type { TapResponse } from '@/lib/nfc/types';

export const dynamic = 'force-dynamic';

// Body is the original SDM query as the chip produced it: preferably { raw: location.search }, or { e, c }.
// Lengths are generous on purpose: TagWriter leftovers (`…&c=XXXX?uid=000…`) are cleaned up by the parser, not rejected here.
const Body = z.union([
  z.object({ raw: z.string().max(2048) }),
  z.object({ e: z.string().max(512), c: z.string().max(512) }),
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

/** What the visitor's page may see: shapes and reason codes, never the UID (operators get it). */
function publicDiag(d: TapDiagnosis, operator: boolean) {
  return operator ? d : { ...d, uid: undefined, counter: undefined };
}

/** POST /api/tap/redeem — the only place a scan is consumed. Never GET. */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const operator = isOperator(request);
  if (limited(ip)) {
    return Response.json({ status: 'rate_limited', message: 'Too many scans. Wait a minute and tap again.' } satisfies TapResponse, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const shape = json && typeof json === 'object' ? Object.fromEntries(Object.entries(json).map(([k, v]) => [k, typeof v === 'string' ? `string(${v.length})` : typeof v])) : typeof json;
    console.warn(JSON.stringify({ evt: 'nfc.redeem.bad_body', shape, issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }));
    return Response.json({ error: 'invalid_body', detail: `The page sent an unexpected tap format (${JSON.stringify(shape)}).` }, { status: 400 });
  }

  const raw = 'raw' in parsed.data ? parsed.data.raw : `?e=${parsed.data.e}&c=${parsed.data.c}`;
  // Dry-run diagnosis (no counter consumed). Logged for operators in Vercel runtime logs: shapes + result + UID, no e/c values.
  const diag = await diagnoseTap(raw).catch((e) => {
    console.error(JSON.stringify({ evt: 'nfc.diagnose.error', message: e instanceof Error ? e.message : String(e) }));
    return null;
  });
  if (diag) console.info(JSON.stringify({ evt: 'nfc.diagnose', ...diag }));

  try {
    const result = await redeemTap(raw);
    console.info(JSON.stringify({ evt: 'nfc.redeem', status: result.status, location: result.location?.id ?? null, uid: diag?.uid ?? null, at: new Date().toISOString() }));
    return Response.json(
      { ...result, diag: diag ? publicDiag(diag, operator) : undefined },
      { headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ evt: 'nfc.redeem.error', message, stack: e instanceof Error ? e.stack?.split('\n').slice(0, 4) : undefined }));
    const notice = e instanceof ConfigError || message.includes('APP_SESSION_SECRET');
    return Response.json(
      { error: notice ? 'not_configured' : 'redeem_failed', detail: notice ? message : `Server error while checking the tag (${message.slice(0, 120)}).`, diag: diag ? publicDiag(diag, operator) : undefined },
      { status: notice ? 503 : 500 },
    );
  }
}
