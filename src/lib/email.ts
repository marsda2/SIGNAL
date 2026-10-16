// Server-only. SIGNAL sends the escalation email itself. The recipient is the space's operator-configured facilities
// address; it is never chosen by the model and never shown to the visitor.
//
// EMAIL_MODE=demo (default): the message goes to SIGNAL's own demo outbox in Core (viewable at /demo/inbox) and is
// confirmed by reading it back. Nothing leaves SIGNAL. EMAIL_MODE=resend: real delivery via Resend.
import { Resend } from 'resend';

import { findDemoEmail, storeDemoEmail, type Space } from './core';

export type EmailMode = 'demo' | 'resend';

export function emailMode(): EmailMode {
  return process.env.EMAIL_MODE?.trim() === 'resend' ? 'resend' : 'demo';
}

export const emailConfigured = () =>
  emailMode() === 'demo' || Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export type EmailResult = { mode: EmailMode; id: string; verified: boolean; evidence: string };

export async function sendEscalationEmail(space: Space, input: { draft: string; incidentKey: string; reference: string }): Promise<EmailResult> {
  const to = space.escalation.email?.trim();
  if (!to) throw new Error('This space has no facilities email set.');
  const subject = `[SIGNAL] ${space.name} · ${input.incidentKey}: visitor report`;
  const text = `${input.draft}\n\nSIGNAL ticket: ${input.incidentKey} (ref ${input.reference})\nThis message was sent automatically by the SIGNAL helper after the visitor approved it.`;

  if (emailMode() === 'demo') {
    await storeDemoEmail({ key: `M-${input.reference}`, spaceId: space.id, incidentKey: input.incidentKey, reference: input.reference, to, subject, text });
    const back = await findDemoEmail(input.reference);
    if (!back) throw new Error('Demo email was not found on read-back.');
    return {
      mode: 'demo',
      id: back.key,
      verified: true,
      evidence: `DEMO email: stored in SIGNAL’s demo inbox at ${back.at} and read back (ref ${input.reference}). No real email was sent.`,
    };
  }

  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) throw new Error('Email is not configured (RESEND_API_KEY / EMAIL_FROM).');
  const { data, error } = await new Resend(key).emails.send({ from, to, subject, text });
  if (error || !data?.id) throw new Error(`Email provider rejected the message: ${error?.message ?? 'no id returned'}`);
  return { mode: 'resend', id: data.id, verified: false, evidence: `Email accepted by the provider (id ${data.id}) for the facilities inbox. Delivery and reading are not confirmed.` };
}
