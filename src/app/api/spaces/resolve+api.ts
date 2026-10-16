import { denied, sessionFrom, visitorAccess } from '@/lib/access';
import { DEFAULT_SPACE_ID } from '@/lib/core';
import { publicSpace } from '@/lib/spaces';

/**
 * GET /api/spaces/resolve?ref=<space id | demo> (+ header x-signal-session) — which space a chat is for.
 * A valid signed NFC session decides the space; NFC-only spaces refuse requests without one.
 */
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get('ref')?.trim() || 'demo';
  const session = sessionFrom(request);
  const spaceId = session?.loc ?? (ref === 'demo' ? DEFAULT_SPACE_ID : ref);
  const access = await visitorAccess(request, spaceId);
  if (!access.ok) return denied(access);
  return Response.json({ space: publicSpace(access.space), verified: access.via === 'nfc', via: access.via });
}
