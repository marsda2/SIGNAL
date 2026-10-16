import { z } from 'zod';

import { denied, visitorAccess } from '@/lib/access';
import { audit } from '@/lib/core';
import { integrationConfig } from '@/lib/env';
import { locationLabel, memory } from '@/lib/memory';

const Body = z.object({
  locationId: z.string().min(1).max(64),
  problem: z.string().min(1).max(300),
  fix: z.string().min(1).max(600),
});

/** POST /api/feedback — visitor tapped "That fixed it". Stored as an *observed, unconfirmed* outcome in memory. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { locationId, problem, fix } = parsed.data;
  const access = await visitorAccess(request, locationId);
  if (!access.ok) return denied(access);
  await audit({ kind: 'visitor.self_resolved', actor: 'visitor', subject: locationId, detail: problem });
  if (!integrationConfig().agentMemory) return Response.json({ remembered: false, reason: 'memory_not_configured' });
  try {
    await memory().remember(
      [
        `SOURCE: visitor feedback via SIGNAL chat (observed, not verified by staff)`,
        `At: ${new Date().toISOString()}`,
        `Problem: ${problem}`,
        `Visitor said this worked: ${fix}`,
      ].join('\n'),
      { infer: 'none', labels: [locationLabel(locationId), 'kind=self_service_outcome'] },
    );
    return Response.json({ remembered: true });
  } catch (e) {
    return Response.json({ remembered: false, reason: e instanceof Error ? e.message : String(e) });
  }
}
