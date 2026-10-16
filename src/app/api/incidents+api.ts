import { z } from 'zod';

import { verifyActionId } from '@/lib/approvals';
import { audit, coreBackend, createIncident, toView } from '@/lib/core';
import { integrationConfig } from '@/lib/env';
import { locationLabel, memory } from '@/lib/memory';
import { flushTraces, withSpan } from '@/lib/tracing';

const Body = z.object({
  actionId: z.string().min(10).max(200),
  locationId: z.string().min(1).max(64),
  summary: z.string().min(1).max(300),
  assetId: z.string().max(64).nullable().optional(),
});

/** POST /api/incidents — visitor-approved CREATE_INCIDENT. Persists to Core first; memory gets an *observed* note. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { actionId, locationId, summary, assetId = null } = parsed.data;
  if (!verifyActionId(actionId, 'CREATE_INCIDENT', locationId, 'new')) {
    await audit({ kind: 'incident.create.rejected', actor: 'visitor', subject: locationId, detail: 'invalid or expired approval' });
    return Response.json({ error: 'approval_invalid' }, { status: 403 });
  }

  const result = await withSpan('tool.create_incident', 'TOOL', { 'tool.name': 'create_incident', 'input.value': summary }, async () => {
    const incident = await createIncident({ locationId, assetId, summary });
    let memoryNote: string | undefined;
    if (integrationConfig().agentMemory) {
      try {
        await memory().remember(
          [
            `SOURCE: visitor report via SIGNAL chat (observed, not confirmed by staff)`,
            `Ticket ${incident.key} opened at ${incident.reportedAt}`,
            `Asset: ${assetId ?? 'unknown'}`,
            `Summary: ${summary}`,
          ].join('\n'),
          { infer: 'none', labels: [locationLabel(locationId), `ticket=${incident.key}`, 'kind=visitor_report'] },
        );
        memoryNote = 'recorded in Agent Memory';
      } catch (e) {
        memoryNote = `memory write failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    return { incident: toView(incident), backend: coreBackend(), memoryNote };
  });
  await flushTraces();
  return Response.json(result);
}
