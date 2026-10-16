import { denied, visitorAccess } from '@/lib/access';
import { getSpace, saveSpace } from '@/lib/core';
import { integrationConfig, isOperator } from '@/lib/env';
import { rememberSpaceProfile } from '@/lib/memory';
import { publicSpace, SpaceSchema } from '@/lib/spaces';

/** GET /api/spaces/:id — public view for visitors; full profile with the operator header. */
export async function GET(request: Request, { id }: { id: string }) {
  if (isOperator(request)) {
    const space = await getSpace(id).catch(() => undefined);
    return space ? Response.json({ space }) : Response.json({ error: 'not_found' }, { status: 404 });
  }
  const access = await visitorAccess(request, id);
  if (!access.ok) return denied(access);
  return Response.json({ space: publicSpace(access.space) });
}

/** PUT /api/spaces/:id — operator-only upsert. Core is authoritative; Agent Memory gets a new profile fact (supersession, no forget). */
export async function PUT(request: Request, { id }: { id: string }) {
  if (!isOperator(request)) return Response.json({ error: 'forbidden' }, { status: 403 });
  const parsed = SpaceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body', issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }, { status: 400 });
  if (parsed.data.id !== id) return Response.json({ error: 'id_mismatch' }, { status: 400 });
  try {
    const saved = await saveSpace({ ...parsed.data, escalation: { ...parsed.data.escalation } });
    let memory = 'not configured';
    if (integrationConfig().agentMemory) {
      memory = await rememberSpaceProfile(saved)
        .then(() => 'profile recorded')
        .catch((e) => `memory write failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return Response.json({ space: saved, memory });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
