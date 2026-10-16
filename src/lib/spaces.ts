// Server-only. Validation + public projection for operator-defined spaces.
import { z } from 'zod';

import type { PublicSpace } from '@/lib/agent/contracts';
import type { Space } from '@/lib/core';

const line = z.string().trim().min(1).max(300);

export const SpaceSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9_-]{2,40}$/, 'lowercase letters, digits, _ or -'),
  name: z.string().trim().min(2).max(80),
  siteName: z.string().trim().max(80).default(''),
  description: z.string().trim().max(800).default(''),
  timezone: z.string().trim().max(60).default('America/New_York'),
  assets: z
    .array(
      z.object({
        id: z.string().trim().regex(/^[a-z0-9_-]{2,40}$/),
        type: z.string().trim().min(2).max(30),
        name: z.string().trim().min(1).max(80),
        model: z.string().trim().max(80).optional(),
        safeTroubleshooting: z.array(line).max(8).default([]),
      }),
    )
    .max(20),
  faqs: z.array(z.object({ q: line, a: z.string().trim().min(1).max(800) })).max(20),
  escalation: z.object({
    urgentPhone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s().-]{6,20}$/, 'phone number')
      .nullable()
      .or(z.literal('').transform(() => null)),
    urgentLabel: z.string().trim().max(80).nullable().optional(),
    email: z.email().nullable().or(z.literal('').transform(() => null)),
    portal: z.enum(['signal_demo', 'external', 'none']),
    portalUrl: z
      .url({ protocol: /^https$/ })
      .nullable()
      .or(z.literal('').transform(() => null)),
    hours: z.string().trim().max(80).nullable().optional(),
  }),
  nfcTags: z.array(z.string().trim().regex(/^[0-9a-fA-F]{14}$/, '7-byte chip UID (14 hex)')).max(20),
  access: z.enum(['nfc', 'open']).default('open'),
});

export function publicSpace(s: Space): PublicSpace {
  return {
    id: s.id,
    name: s.name,
    siteName: s.siteName,
    description: s.description,
    assets: s.assets.map((a) => ({ id: a.id, type: a.type, name: a.name })),
    hasUrgentLine: Boolean(s.escalation.urgentPhone),
    access: s.access ?? 'open',
  };
}
