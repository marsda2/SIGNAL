import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { denied, visitorAccess } from '@/lib/access';
import { buildReportDraft, externalPortal, startExternalReport } from '@/lib/anchor';
import { verifyActionId } from '@/lib/approvals';
import { audit, createAttempt, createIncident, getIncident, inFlightAttempt, updateAttempt } from '@/lib/core';
import { flags, integrationConfig } from '@/lib/env';
import { flushTraces, withSpan } from '@/lib/tracing';

const Body = z.object({
  actionId: z.string().min(10).max(200),
  locationId: z.string().min(1).max(64),
  summary: z.string().min(1).max(400),
  assetId: z.string().max(64).nullable().optional(),
  incidentKey: z.string().max(32).nullable().optional(),
});

/**
 * POST /api/actions/external-report — visitor-approved SUBMIT_EXTERNAL_REPORT.
 * Anchor fills the company's OWN report form (URL + instructions set by the operator in /admin/spaces) with the
 * draft the visitor saw. We record the report in Core first. We cannot read a third-party site back, so the
 * outcome is at best AGENT_REPORTED (Anchor's claim + confirmation text), never VERIFIED.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { actionId, locationId, summary, assetId = null, incidentKey = null } = parsed.data;
  const access = await visitorAccess(request, locationId);
  if (!access.ok) return denied(access);
  const space = access.space;

  if (!verifyActionId(actionId, 'SUBMIT_EXTERNAL_REPORT', locationId, incidentKey ?? 'new')) {
    await audit({ kind: 'action.external_report.rejected', actor: 'visitor', subject: locationId, detail: 'invalid or expired approval' });
    return Response.json({ error: 'approval_invalid' }, { status: 403 });
  }
  if (!integrationConfig().anchor) return Response.json({ error: 'anchor_not_configured', message: 'ANCHORBROWSER_API_KEY is not set.' }, { status: 503 });
  if (!flags.anchorActions) return Response.json({ error: 'anchor_disabled', message: 'Portal automation is off (ENABLE_ANCHOR_ACTIONS=false). Your report was not sent.' }, { status: 403 });
  let host: string;
  try {
    host = externalPortal(space).host;
  } catch (e) {
    return Response.json({ error: 'no_external_portal', message: e instanceof Error ? e.message : String(e) }, { status: 409 });
  }

  // Keep our own record first, so "seen before" and the audit trail work even if the external site fails.
  let incident = incidentKey ? await getIncident(incidentKey) : undefined;
  if (incidentKey && (!incident || incident.locationId !== locationId)) return Response.json({ error: 'incident_not_found' }, { status: 404 });
  if (!incident) incident = await createIncident({ locationId, assetId, summary: summary.slice(0, 300) });

  const existing = await inFlightAttempt(incident.key);
  if (existing) return Response.json({ attempt: existing, reused: true });

  const assetName = space.assets.find((a) => a.id === (assetId ?? incident!.assetId))?.name ?? null;
  const attempt = await createAttempt({
    key: `A-${randomUUID().slice(0, 8)}`,
    kind: 'EXTERNAL_REPORT',
    incidentKey: incident.key,
    locationId,
    state: 'PENDING',
    requestedStatus: 'OPEN',
    reference: randomUUID().slice(0, 6).toUpperCase(),
    note: buildReportDraft(space, { summary, assetName, incidentKey: incident.key }),
    targetHost: host,
  });

  const result = await withSpan('tool.anchor.external_report', 'TOOL', { 'tool.name': 'anchor_external_report', 'signal.portal_host': host, 'signal.attempt': attempt.key }, async (span) => {
    try {
      const started = await startExternalReport(space, attempt);
      span.setAttribute('signal.anchor.session', started.sessionId);
      return await updateAttempt(attempt.key, { state: 'INITIATED', anchorSessionId: started.sessionId, liveViewUrl: started.liveViewUrl, workflowId: started.workflowId });
    } catch (e) {
      return updateAttempt(attempt.key, { state: 'FAILED', error: e instanceof Error ? e.message : String(e) });
    }
  });
  await flushTraces();
  return Response.json({ attempt: result });
}
