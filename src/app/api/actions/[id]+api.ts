import { denied, visitorAccess } from '@/lib/access';
import { endSession, workflowStatus } from '@/lib/anchor';
import { getAttempt, getIncident, toView, updateAttempt, type ActionAttempt } from '@/lib/core';
import { flushTraces, withSpan } from '@/lib/tracing';

const TIMEOUT_MS = 5 * 60 * 1000;
const terminal = (a: ActionAttempt) => a.state === 'VERIFIED' || a.state === 'FAILED' || a.state === 'PENDING_REVIEW';

/**
 * GET /api/actions/:id — poll an action. Read-after-write: VERIFIED only when Core shows the ticket with the
 * requested status AND a note carrying this attempt's reference. The agent's own "done" is never trusted.
 */
export async function GET(request: Request, { id }: { id: string }) {
  let attempt = await getAttempt(id);
  if (!attempt) return Response.json({ error: 'not_found' }, { status: 404 });
  const access = await visitorAccess(request, attempt.locationId);
  if (!access.ok) return denied(access);

  if (!terminal(attempt)) {
    attempt = await withSpan('verify.portal_readback', 'TOOL', { 'tool.name': 'portal_readback', 'signal.attempt': id }, async (span) => {
      const a = attempt!;
      const incident = await getIncident(a.incidentKey);
      const note = incident?.notes.find((n) => n.text.includes(a.reference));
      span.setAttribute('signal.readback.found', Boolean(note));
      if (incident && note && incident.status === a.requestedStatus) {
        const evidence = `Read back ${incident.key} from the portal database: status ${incident.status}, note saved ${note.at} with ref ${a.reference}.`;
        return (await updateAttempt(a.key, { state: 'VERIFIED', evidence })) ?? a;
      }
      if (!a.workflowId) return a;
      const wf = await workflowStatus(a.workflowId).catch((e) => ({ status: 'RUNNING' as const, error: String(e) }));
      span.setAttribute('signal.anchor.workflow_status', wf.status);
      if (wf.status === 'FAILED') return (await updateAttempt(a.key, { state: 'FAILED', error: wf.error ?? 'Anchor task failed' })) ?? a;
      if (wf.status === 'COMPLETED') {
        // Agent says done but the change isn't in the DB: don't claim success.
        return (await updateAttempt(a.key, { state: 'PENDING_REVIEW', agentResult: 'result' in wf ? wf.result : null, evidence: note ? 'Note found but status differs from request.' : 'Agent reported completion, but no matching update was found on read-back.' })) ?? a;
      }
      if (Date.now() - Date.parse(a.createdAt) > TIMEOUT_MS) return (await updateAttempt(a.key, { state: 'PENDING_REVIEW', evidence: 'Timed out waiting for the portal update.' })) ?? a;
      return a;
    });
    if (terminal(attempt) && attempt.anchorSessionId) await endSession(attempt.anchorSessionId);
    await flushTraces();
  }

  const incident = await getIncident(attempt.incidentKey);
  return Response.json({ attempt, incident: incident ? toView(incident) : null });
}
