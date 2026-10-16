import { z } from 'zod';

import { updateIncidentFromPortal } from '@/lib/core';

const Body = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  note: z.string().max(500).default(''),
});

/** POST /api/portal/tickets/:id — the portal's "Save update" button. This is what Anchor's clicks end up calling. */
export async function POST(request: Request, { id }: { id: string }) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const updated = await updateIncidentFromPortal(id, { ...parsed.data, by: 'portal_user' });
  if (!updated) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json({ ticket: updated });
}
