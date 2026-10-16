// Server-only. Who may use a space's visitor APIs. A space with access "nfc" only works with a signed session
// minted by POST /api/tap/redeem after a verified NTAG 424 DNA tap for that same space. Operators bypass for testing.
import { getSpace, type Space } from './core';
import { isOperator } from './env';
import { readSession, type VisitorSession } from './nfc/session';

export const SESSION_HEADER = 'x-signal-session';

export type Access =
  | { ok: true; space: Space; session: VisitorSession | null; via: 'nfc' | 'open' | 'operator' }
  | { ok: false; status: 401 | 404; error: 'nfc_required' | 'not_found'; spaceName?: string };

export function sessionFrom(request: Request): VisitorSession | null {
  const token = request.headers.get(SESSION_HEADER)?.trim();
  return token ? readSession(token) : null;
}

export async function visitorAccess(request: Request, spaceId: string): Promise<Access> {
  const space = await getSpace(spaceId).catch(() => undefined);
  if (!space) return { ok: false, status: 404, error: 'not_found' };
  const session = sessionFrom(request);
  if ((space.access ?? 'open') === 'open') return { ok: true, space, session, via: 'open' };
  if (session?.verified && session.loc === space.id) return { ok: true, space, session, via: 'nfc' };
  if (isOperator(request)) return { ok: true, space, session, via: 'operator' };
  return { ok: false, status: 401, error: 'nfc_required', spaceName: space.name };
}

export const denied = (a: Extract<Access, { ok: false }>) =>
  Response.json(
    { error: a.error, spaceName: a.spaceName, message: a.error === 'nfc_required' ? `Tap the NFC chip in ${a.spaceName} to start.` : 'Unknown space.' },
    { status: a.status },
  );
