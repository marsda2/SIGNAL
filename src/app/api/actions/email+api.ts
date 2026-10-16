import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { denied, visitorAccess } from '@/lib/access';
import { buildReportDraft } from '@/lib/anchor';
import { verifyActionId } from '@/lib/approvals';
import { addIncidentNote, audit, createAttempt, createIncident, getIncident, updateAttempt } from '@/lib/core';
import { emailConfigured, sendEscalationEmail } from '@/lib/email';
import { flushTraces, withSpan } from '@/lib/tracing';

const Body = z.object({
  actionId: z.string().min(10).max(200),
  locationId: z.string().min(1).max(64),
  summary: z.string().min(1).max(400),
  assetId: z.string().max(64).nullable().optional(),
  incidentKey: z.string().max(32).nullable().optional(),
});

/**
 * POST /api/actions/email — visitor-approved SEND_EMAIL. SIGNAL emails the space's facilities inbox itself.
 * "Accepted by the email provider" is not "read by staff", so the result is AGENT_REPORTED with the provider id.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { actionId, locationId, summary, assetId = null, incidentKey = null } = parsed.data;
  const access = await visitorAccess(request, locationId);
  if (!access.ok) return denied(access);
  const space = access.space;

  if (!verifyActionId(actionId, 'SEND_EMAIL', locationId, incidentKey ?? 'new')) {
    await audit({ kind: 'action.email.rejected', actor: 'visitor', subject: locationId, detail: 'invalid or expired approval' });
    return Response.json({ error: 'approval_invalid' }, { status: 403 });
  }
  if (!emailConfigured() || !space.escalation.email) return Response.json({ error: 'email_not_configured', message: 'Email escalation isn’t set up for this space.' }, { status: 503 });

  let incident = incidentKey ? await getIncident(incidentKey) : undefined;
  if (incidentKey && (!incident || incident.locationId !== locationId)) return Response.json({ error: 'incident_not_found' }, { status: 404 });
  if (!incident) incident = await createIncident({ locationId, assetId, summary: summary.slice(0, 300) });

  const assetName = space.assets.find((a) => a.id === (assetId ?? incident!.assetId))?.name ?? null;
  const attempt = await createAttempt({
    key: `A-${randomUUID().slice(0, 8)}`,
    kind: 'EMAIL_REPORT',
    incidentKey: incident.key,
    locationId,
    state: 'PENDING',
    requestedStatus: 'OPEN',
    reference: randomUUID().slice(0, 6).toUpperCase(),
    note: buildReportDraft(space, { summary, assetName, incidentKey: incident.key }),
  });

  const result = await withSpan('tool.email.escalation', 'TOOL', { 'tool.name': 'send_escalation_email', 'signal.attempt': attempt.key }, async () => {
    try {
      const sent = await sendEscalationEmail(space, { draft: attempt.note, incidentKey: incident!.key, reference: attempt.reference });
      await addIncidentNote(incident!.key, { by: 'signal_email', text: sent.mode === 'demo' ? `Demo email to facilities (${sent.id})` : `Emailed facilities (provider id ${sent.id})` }).catch(() => undefined);
      // Demo: read back from our own outbox → VERIFIED (clearly labelled demo). Real email: provider accepted ≠ read.
      return updateAttempt(attempt.key, { state: sent.verified ? 'VERIFIED' : 'AGENT_REPORTED', evidence: sent.evidence });
    } catch (e) {
      return updateAttempt(attempt.key, { state: 'FAILED', error: e instanceof Error ? e.message : String(e) });
    }
  });
  await flushTraces();
  return Response.json({ attempt: result });
}
