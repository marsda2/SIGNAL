// Server-only. SIGNAL sends the escalation email itself (Resend). The recipient is the space's operator-configured
// facilities address; it is never chosen by the model and never shown to the visitor.
import { Resend } from 'resend';

import type { Space } from './core';

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export async function sendEscalationEmail(space: Space, input: { draft: string; incidentKey: string; reference: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const to = space.escalation.email?.trim();
  if (!key || !from) throw new Error('Email is not configured (RESEND_API_KEY / EMAIL_FROM).');
  if (!to) throw new Error('This space has no facilities email set.');
  const { data, error } = await new Resend(key).emails.send({
    from,
    to,
    subject: `[SIGNAL] ${space.name} · ${input.incidentKey}: visitor report`,
    text: `${input.draft}\n\nSIGNAL ticket: ${input.incidentKey} (ref ${input.reference})\nThis message was sent automatically by the SIGNAL helper after the visitor approved it.`,
  });
  if (error || !data?.id) throw new Error(`Email provider rejected the message: ${error?.message ?? 'no id returned'}`);
  return { id: data.id };
}
