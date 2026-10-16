import { audit, getAttempt, listAttemptsByCallSid, updateAttempt } from '@/lib/core';
import { describeCall, validateTwilioSignature, type TwilioCallStatus } from '@/lib/twilio';

/**
 * POST /api/webhooks/twilio/status — Twilio call progress callbacks (form-encoded).
 * Rejected unless X-Twilio-Signature validates against TWILIO_AUTH_TOKEN. Stores only status + duration.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
  // Behind Vercel's proxy request.url can differ from the URL Twilio signed, so rebuild it from the forwarded host.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const url = host ? `${proto}://${host}${new URL(request.url).pathname}` : request.url;
  if (!validateTwilioSignature(url, params, request.headers.get('x-twilio-signature'))) {
    await audit({ kind: 'webhook.twilio.rejected', actor: 'twilio', subject: params.CallSid ?? '-', detail: 'bad signature' });
    return new Response('forbidden', { status: 403 });
  }
  const sid = params.CallSid;
  if (!sid) return new Response('missing CallSid', { status: 400 });

  const attempt = (await listAttemptsByCallSid(sid))[0];
  if (!attempt) return new Response('ok'); // not ours / already pruned
  const current = await getAttempt(attempt.key);
  if (current && ['VERIFIED', 'FAILED'].includes(current.state)) return new Response('ok'); // terminal; ignore late events

  const { state, evidence } = describeCall({ status: params.CallStatus as TwilioCallStatus, duration: params.CallDuration ?? null });
  await updateAttempt(attempt.key, { state, evidence });
  await audit({ kind: 'webhook.twilio.status', actor: 'twilio', subject: attempt.key, detail: `${params.CallStatus}${params.CallDuration ? ` ${params.CallDuration}s` : ''}` });
  return new Response('ok');
}
