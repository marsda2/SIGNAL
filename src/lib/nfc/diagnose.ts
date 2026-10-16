// Server-only. Explains what a tap URL contained WITHOUT consuming it and without echoing the one-time values.
// Used for logs (operators read them in Vercel) and for the "Tap details" panel on /t.

import { spaceIdForTag } from '@/lib/core';

import { nfcMode } from './config';
import { extractSunFields } from './ntag424';
import { inspectTap } from './redeem';

export type ParamShape = { name: string; length: number; hex: boolean };

export type TapDiagnosis = {
  mode: 'verified' | 'simulated';
  params: ParamShape[];
  /** Found 32-hex e/picc_data/enc and 16-hex c/cmac somewhere in the query. */
  fieldsFound: boolean;
  /** TagWriter left its `?uid=…` template behind (harmless, but tells us how the chip was written). */
  trailingUidTemplate: boolean;
  sun: 'ok' | 'malformed' | 'not_configured' | 'bad_picc' | 'bad_mac';
  factoryKeys: boolean;
  uid?: string;
  counter?: number;
  linkedVia?: 'env' | 'admin' | null;
  hint: string;
};

const HINT: Record<TapDiagnosis['sun'], string> = {
  ok: 'Chip message is valid.',
  malformed: 'No 32-hex `e` and 16-hex `c` found. Rewrite the chip URL as /t?e=<32 zeros>&c=<16 zeros> (docs/10 §2).',
  not_configured: 'e/c are still all zeros: SDM mirroring is off. Enable SDM + UID + counter mirroring in TagWriter (docs/10 §2.3).',
  bad_picc: 'Could not decrypt e: Meta Read key must be 00 (not 0F), UID + counter mirroring on (docs/10 §5).',
  bad_mac: 'MAC check failed: CMAC key must be 00 and both MAC offsets must equal the cursor right after c= (docs/10 §5).',
};

function shapes(raw: string): ParamShape[] {
  const q = raw.includes('?') ? raw.slice(raw.indexOf('?') + 1) : raw;
  // TagWriter leftovers add a second "?": treat it as another separator so every param is listed.
  const params = new URLSearchParams(q.replace(/\?/g, '&'));
  const out: ParamShape[] = [];
  params.forEach((v, name) => out.push({ name, length: v.length, hex: /^[0-9a-f]+$/i.test(v) }));
  return out.slice(0, 12);
}

export async function diagnoseTap(raw: string): Promise<TapDiagnosis> {
  const { sun, locationId, factoryKeys } = inspectTap(raw);
  const base = {
    mode: nfcMode(),
    params: shapes(raw),
    fieldsFound: Boolean(extractSunFields(raw)),
    trailingUidTemplate: /[?&]uid=0{8,}/i.test(raw),
    factoryKeys,
  };
  if (!sun.ok) return { ...base, sun: sun.reason, hint: HINT[sun.reason] };
  const adminSpace = locationId ? undefined : await spaceIdForTag(sun.uid).catch(() => undefined);
  const linkedVia = locationId ? 'env' : adminSpace ? 'admin' : null;
  return {
    ...base,
    sun: 'ok',
    uid: sun.uid,
    counter: sun.counter,
    linkedVia,
    hint: linkedVia ? HINT.ok : `${HINT.ok} Not linked to a space yet: link UID ${sun.uid} in /t (operator) or set NFC_TAGS=${sun.uid}=<space id>.`,
  };
}
