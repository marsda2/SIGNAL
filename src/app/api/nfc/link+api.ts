import { z } from 'zod';

import { audit, coreBackend, getSpace, listSpaces, saveSpace } from '@/lib/core';
import { isOperator } from '@/lib/env';
import { diagnoseTap } from '@/lib/nfc/diagnose';

export const dynamic = 'force-dynamic';

const Body = z.object({ raw: z.string().max(2048), spaceId: z.string().min(1).max(64) });

/**
 * POST /api/nfc/link — operator-only (x-demo-secret). Tap a chip, then link it to a space.
 * Verifies the chip's SUN message WITHOUT consuming the counter, takes the UID from the decrypted message
 * (never from user input), removes it from any other space and adds it to the chosen one.
 */
export async function POST(request: Request) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden', detail: 'Enter the operator secret in /admin/spaces first (same tab).' }, { status: 403 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { raw, spaceId } = parsed.data;

  const diag = await diagnoseTap(raw);
  console.info(JSON.stringify({ evt: 'nfc.link.attempt', spaceId, sun: diag.sun, uid: diag.uid ?? null }));
  if (diag.sun !== 'ok' || !diag.uid) return Response.json({ error: 'chip_not_verified', detail: diag.hint, diag }, { status: 422 });

  const target = await getSpace(spaceId);
  if (!target) return Response.json({ error: 'space_not_found' }, { status: 404 });

  const uid = diag.uid;
  for (const s of await listSpaces()) {
    if (s.id !== spaceId && s.nfcTags.includes(uid)) await saveSpace({ ...s, nfcTags: s.nfcTags.filter((t) => t !== uid) }, 'operator:nfc-link');
  }
  const saved = target.nfcTags.includes(uid) ? target : await saveSpace({ ...target, nfcTags: [...target.nfcTags, uid] }, 'operator:nfc-link');
  await audit({ kind: 'nfc.linked', actor: 'operator', subject: spaceId, detail: uid });

  const durable = coreBackend() === 'surrealdb';
  return Response.json({
    uid,
    counter: diag.counter,
    space: { id: saved.id, name: saved.name },
    durable,
    envLine: `NFC_TAGS=${uid}=${spaceId}`,
    note: durable
      ? 'Saved in SurrealDB Core.'
      : 'Saved in the local store only (no SurrealDB): it can be lost when the server restarts. For the demo, also set the env line below on Vercel and redeploy.',
    mode: diag.mode,
  });
}
