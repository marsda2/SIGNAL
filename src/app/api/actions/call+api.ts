import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { denied, visitorAccess } from '@/lib/access';
import { verifyActionId } from '@/lib/approvals';
import { audit, createAttempt, getIncident, getSpace, inFlightAttempt, recentCallAttempt, updateAttempt } from '@/lib/core';
import { flags, integrationConfig } from '@/lib/env';
import { flushTraces, withSpan } from '@/lib/tracing';
import { callTwiml, placeCall } from '@/lib/twilio';

const Body = z.object({
  actionId: z.string().min(10).max(200),
  locationId: z.string().min(1).max(64),
  incidentKey: z.string().min(1).max(32),
  summary: z.string().min(1).max(300),
});

const COOLDOWN_MS = 10 * 60 * 1000;
const E164 =/^\+[1-9]\d{6,14}$/;

/** Public origin Twilio can reach for status callbacks. Absent on localhost → we poll Twilio instead. */
function publicBase(): string | null {
  const explicit = process.env.PUBLIC_BASE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const base = explicit || (vercel ? `https://${vercel}` : '');
  return base && !/localhost|127\.0\.0\.1/.test(base) ? base.replace(/\/+$/, '') : null;
}

/**
 * POST /api/actions/call — visitor-approved REQUEST_MAINTENANCE_CALL via Twilio.
 * Server-side policy (never the model): calls flag on, Twilio configured, valid HMAC approval bound to this ticket,
 * destination is ONLY the operator's pre-approved number from env, one in-flight call per ticket.
 * Returns INITIATED — "initiated" is not "staff notified"; GET /api/actions/:id + the webhook report the real outcome.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { actionId, locationId, incidentKey, summary } = parsed.data;
  const access = await visitorAccess(request, locationId);
  if (!access.ok) return denied(access);

  if (!verifyActionId(actionId, 'MAINTENANCE_CALL', locationId, incidentKey)) {
    await audit({ kind: 'action.call.rejected', actor: 'visitor', subject: incidentKey, detail: 'invalid or expired approval' });
    return Response.json({ error: 'approval_invalid' }, { status: 403 });
  }
  if (!flags.outboundCalls) {
    return Response.json({ error: 'calls_disabled', message: 'Outbound calls are off (ENABLE_OUTBOUND_CALLS=false). No call was placed.' }, { status: 403 });
  }
  const cfg = integrationConfig();
  const to = process.env.DEMO_APPROVED_PHONE_E164?.trim() ?? '';
  if (!cfg.twilio) return Response.json({ error: 'twilio_not_configured', message: 'Twilio credentials or TWILIO_PHONE_NUMBER are missing. No call was placed.' }, { status: 503 });
  if (!E164.test(to)) return Response.json({ error: 'no_approved_number', message: 'No valid DEMO_APPROVED_PHONE_E164 is set. No call was placed.' }, { status: 503 });

  const incident = await getIncident(incidentKey);
  if (!incident || incident.locationId !== locationId) return Response.json({ error: 'incident_not_found' }, { status: 404 });
  const existing = await inFlightAttempt(incidentKey, 'MAINTENANCE_CALL');
  if (existing) return Response.json({ attempt: existing, reused: true });
  if (await recentCallAttempt(incidentKey, COOLDOWN_MS)) {
    return Response.json({ error: 'call_cooldown', message: 'A call for this ticket was placed in the last 10 minutes, so I won’t call the maintenance line again yet.' }, { status: 429 });
  }
  const space = await getSpace(locationId);

  const attempt = await createAttempt({
    key: `A-${randomUUID().slice(0, 8)}`,
    kind: 'MAINTENANCE_CALL',
    incidentKey,
    locationId,
    state: 'PENDING',
    requestedStatus: incident.status,
    reference: randomUUID().slice(0, 6).toUpperCase(),
    note: `Approved call to the pre-approved maintenance line: ${summary.replace(/\s+/g, ' ').slice(0, 200)}`,
  });
  await audit({ kind: 'action.call.requested', actor: 'visitor', subject: attempt.key, detail: `ticket ${incidentKey}, to ***${to.slice(-4)}` });

  const result = await withSpan('tool.twilio.call', 'TOOL', { 'tool.name': 'twilio_call', 'signal.incident': incidentKey, 'signal.attempt': attempt.key }, async (span) => {
    try {
      const base = publicBase();
      const call = await placeCall({
        to,
        twiml: callTwiml({ spaceName: space?.name ?? locationId, incidentKey, summary }),
        statusCallback: base ? `${base}/api/webhooks/twilio/status` : undefined,
      });
      span.setAttribute('signal.twilio.call_sid', call.sid);
      await audit({ kind: 'action.call.initiated', actor: 'system', subject: attempt.key, detail: `call ${call.sid} ${call.status}` });
      return updateAttempt(attempt.key, { state: 'INITIATED', callSid: call.sid, evidence: `Twilio accepted the call (${call.status}). Not delivered or acknowledged yet.` });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await audit({ kind: 'action.call.failed', actor: 'system', subject: attempt.key, detail: error.slice(0, 200) });
      return updateAttempt(attempt.key, { state: 'FAILED', error, evidence: 'The call was not placed. Staff were not notified.' });
    }
  });
  await flushTraces();
  return Response.json({ attempt: result });
}
