// Server-only. Binds an approval button to exactly the action the server offered (kind + location + target),
// so a client can't replay an actionId against a different ticket. HMAC over APP_SESSION_SECRET.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const TTL_MS = 30 * 60 * 1000;

function secret() {
  const s = process.env.APP_SESSION_SECRET?.trim();
  if (!s) throw new Error('APP_SESSION_SECRET not set');
  return s;
}

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

export function issueActionId(kind: string, locationId: string, target: string): string {
  const nonce = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  return `${nonce}.${sign([nonce, kind, locationId, target].join('|'))}`;
}

export function verifyActionId(actionId: string, kind: string, locationId: string, target: string): boolean {
  const [nonce, mac] = actionId.split('.');
  if (!nonce || !mac) return false;
  const issuedAt = parseInt(nonce.split('-')[0] ?? '', 36);
  if (!issuedAt || Date.now() - issuedAt > TTL_MS) return false;
  const expected = Buffer.from(sign([nonce, kind, locationId, target].join('|')));
  const given = Buffer.from(mac);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
