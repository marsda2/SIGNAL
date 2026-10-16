// Short-lived, location-scoped visitor session token (HMAC-SHA256). Carries no phone, admin or incident rights.

/// <reference types="node" />
import { createHmac, timingSafeEqual } from 'node:crypto';

export type VisitorSession = { loc: string; verified: boolean; iat: number; exp: number };

const TTL_SECONDS = 30 * 60;

function secret(): string {
  const value = process.env.APP_SESSION_SECRET?.trim();
  if (!value || value.length < 32) throw new Error('APP_SESSION_SECRET (>= 32 chars) not set');
  return value;
}

const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url');

export function mintSession(locationId: string, verified: boolean): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: VisitorSession = { loc: locationId, verified, iat: now, exp: now + TTL_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/** For /api/chat and friends: returns the session or null if forged, malformed or expired. */
export function readSession(token: string): VisitorSession | null {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString()) as VisitorSession;
    return session.exp > Math.floor(Date.now() / 1000) ? session : null;
  } catch {
    return null;
  }
}
