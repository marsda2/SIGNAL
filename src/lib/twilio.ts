// Server-only Twilio Programmable Voice client. Plain REST (no SDK) so it bundles cleanly into the Expo server build.
// Docs: https://www.twilio.com/docs/voice/tutorials/how-to-make-outbound-phone-calls
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.twilio.com/2010-04-01';

export type TwilioCallStatus = 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
export type TwilioCall = { sid: string; status: TwilioCallStatus; duration?: string | null; to?: string; from?: string };

/** Auth: API key (SK…) + secret is preferred; falls back to Account SID + Auth Token. */
function auth() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const apiKey = process.env.TWILIO_API_KEY?.trim();
  const apiSecret = process.env.TWILIO_API_SECRET?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid) throw new Error('TWILIO_ACCOUNT_SID not set');
  const [user, pass] = apiKey && apiSecret ? [apiKey, apiSecret] : token ? [accountSid, token] : [];
  if (!user || !pass) throw new Error('Set TWILIO_API_KEY + TWILIO_API_SECRET, or TWILIO_AUTH_TOKEN');
  return { accountSid, header: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` };
}

export function twilioConfigured(): boolean {
  const has = (n: string) => Boolean(process.env[n]?.trim());
  return has('TWILIO_ACCOUNT_SID') && has('TWILIO_PHONE_NUMBER') && ((has('TWILIO_API_KEY') && has('TWILIO_API_SECRET')) || has('TWILIO_AUTH_TOKEN'));
}

const xml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);

/** Spoken script. Always discloses it is automated; never claims anyone has been or will be dispatched. */
export function callTwiml(p: { spaceName: string; incidentKey: string; summary: string }): string {
  const summary = p.summary.replace(/\s+/g, ' ').slice(0, 200);
  const say = (t: string) => `<Say voice="Polly.Joanna-Generative">${xml(t)}</Say>`;
  return `<Response>${say(
    `Hello. This is an automated call from SIGNAL, an A I assistant, placed with a visitor's approval. A visitor in ${p.spaceName} reported: ${summary}. This is ticket ${p.incidentKey}. Please check the maintenance portal. This call cannot take replies.`,
  )}<Pause length="1"/>${say('Repeating once.')}${say(`Ticket ${p.incidentKey}. ${summary}`)}</Response>`;
}

export async function placeCall(p: { to: string; twiml: string; statusCallback?: string }): Promise<TwilioCall> {
  const { accountSid, header } = auth();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();
  if (!from) throw new Error('TWILIO_PHONE_NUMBER not set');
  const body = new URLSearchParams({ To: p.to, From: from, Twiml: p.twiml });
  if (p.statusCallback) {
    body.set('StatusCallback', p.statusCallback);
    body.set('StatusCallbackMethod', 'POST');
    for (const ev of ['initiated', 'ringing', 'answered', 'completed']) body.append('StatusCallbackEvent', ev);
  }
  const res = await fetch(`${API}/Accounts/${accountSid}/Calls.json`, {
    method: 'POST',
    headers: { Authorization: header, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${String(json.message ?? 'call create failed')}${json.code ? ` (code ${json.code})` : ''}`);
  return { sid: String(json.sid), status: json.status as TwilioCallStatus, to: String(json.to ?? ''), from: String(json.from ?? '') };
}

export async function fetchCall(sid: string): Promise<TwilioCall> {
  const { accountSid, header } = auth();
  const res = await fetch(`${API}/Accounts/${accountSid}/Calls/${encodeURIComponent(sid)}.json`, { headers: { Authorization: header }, signal: AbortSignal.timeout(15_000) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${String(json.message ?? 'call fetch failed')}`);
  return { sid: String(json.sid), status: json.status as TwilioCallStatus, duration: (json.duration as string | null) ?? null };
}

/** X-Twilio-Signature = base64(HMAC-SHA1(authToken, url + concat(sorted key+value of POST params))). Needs the Auth Token. */
export function validateTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!token || !signature) return false;
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  const expected = Buffer.from(createHmac('sha1', token).update(data, 'utf8').digest('base64'));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Maps a Twilio status to our ActionState + honest evidence. "completed" means delivered, NOT acknowledged. */
export function describeCall(c: Pick<TwilioCall, 'status' | 'duration'>): { state: 'INITIATED' | 'VERIFIED' | 'FAILED'; evidence: string } {
  const secs = Number(c.duration ?? 0);
  switch (c.status) {
    case 'completed':
      return secs > 0
        ? { state: 'VERIFIED', evidence: `Twilio reports the call was answered and completed (${secs}s). The message was played; nobody has acknowledged the ticket.` }
        : { state: 'FAILED', evidence: 'Twilio reports the call completed with 0 seconds — it was not answered.' };
    case 'busy':
    case 'no-answer':
    case 'failed':
    case 'canceled':
      return { state: 'FAILED', evidence: `Call not delivered (${c.status}). Staff were not notified.` };
    default:
      return { state: 'INITIATED', evidence: `Call ${c.status}. Waiting for the outcome — not confirmed yet.` };
  }
}
