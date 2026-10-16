import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { startPortalUpdate } from '@/lib/anchor';
import { verifyActionId } from '@/lib/approvals';
import { audit, createAttempt, getIncident, inFlightAttempt, updateAttempt } from '@/lib/core';
import { flags, integrationConfig } from '@/lib/env';
import { flushTraces, withSpan } from '@/lib/tracing';

const Body = z.object({
  actionId: z.string().min(10).max(200),
  locationId: z.string().min(1).max(64),
  incidentKey: z.string().min(1).max(32),
  summary: z.string().min(1).max(300),
});

/**
 * POST /api/actions/portal-update — visitor-approved UPDATE_PORTAL.
 * Starts an Anchor agent on our own portal and returns immediately with the live view; the client polls
 * GET /api/actions/:id, which marks VERIFIED only after reading the change back from Core.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { actionId, locationId, incidentKey, summary } = parsed.data;

  if (!verifyActionId(actionId, 'UPDATE_PORTAL', locationId, incidentKey)) {
    await audit({ kind: 'action.portal_update.rejected', actor: 'visitor', subject: incidentKey, detail: 'invalid or expired approval' });
    return Response.json({ error: 'approval_invalid' }, { status: 403 });
  }
  const cfg = integrationConfig();
  if (!cfg.anchor) return Response.json({ error: 'anchor_not_configured', message: 'ANCHORBROWSER_API_KEY is not set.' }, { status: 503 });
  if (!flags.anchorActions) {
    return Response.json({ error: 'anchor_disabled', message: 'Portal automation is off (ENABLE_ANCHOR_ACTIONS=false). Your report was not sent.' }, { status: 403 });
  }
  const incident = await getIncident(incidentKey);
  if (!incident || incident.locationId !== locationId) return Response.json({ error: 'incident_not_found' }, { status: 404 });

  const existing = await inFlightAttempt(incidentKey);
  if (existing) return Response.json({ attempt: existing, reused: true });

  const attempt = await createAttempt({
    key: `A-${randomUUID().slice(0, 8)}`,
    kind: 'PORTAL_UPDATE',
    incidentKey,
    locationId,
    state: 'PENDING',
    requestedStatus: incident.status === 'RESOLVED' ? 'OPEN' : 'IN_PROGRESS',
    reference: randomUUID().slice(0, 6).toUpperCase(),
    note: `Visitor report via SIGNAL: ${summary.replace(/\s+/g, ' ').slice(0, 200)}`,
  });

  const result = await withSpan('tool.anchor.portal_update', 'TOOL', { 'tool.name': 'anchor_portal_update', 'signal.incident': incidentKey, 'signal.attempt': attempt.key }, async (span) => {
    try {
      const started = await startPortalUpdate(attempt);
      span.setAttribute('signal.anchor.session', started.sessionId);
      return await updateAttempt(attempt.key, {
        state: 'INITIATED',
        anchorSessionId: started.sessionId,
        liveViewUrl: started.liveViewUrl,
        workflowId: started.workflowId,
      });
    } catch (e) {
      return updateAttempt(attempt.key, { state: 'FAILED', error: e instanceof Error ? e.message : String(e) });
    }
  });
  await flushTraces();
  return Response.json({ attempt: result });
}
