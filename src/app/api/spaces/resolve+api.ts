import { DEFAULT_SPACE_ID, getSpace } from '@/lib/core';
import { readSession } from '@/lib/nfc/session';
import { publicSpace } from '@/lib/spaces';

/**
 * GET /api/spaces/resolve?ref=<session token | space id | demo> — which space a chat is for.
 * A valid signed NFC session wins; a bare space id is accepted but marked unverified.
 */
export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get('ref')?.trim() || 'demo';
  const session = ref.length > 40 ? readSession(ref) : null;
  const spaceId = session?.loc ?? (ref === 'demo' ? DEFAULT_SPACE_ID : ref);
  const space = await getSpace(spaceId).catch(() => undefined);
  if (!space) return Response.json({ error: 'not_found', spaceId }, { status: 404 });
  return Response.json({ space: publicSpace(space), verified: Boolean(session?.verified), sessionToken: session ? ref : undefined });
}
