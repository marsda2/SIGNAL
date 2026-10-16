// Redeem orchestration: SDM verify -> tag->location lookup -> anti-replay -> session. Server-only.
// Called from POST /api/tap/redeem. GET /t and /api/nfc/inspect never reach `consume`.

import fixtures from '@/data/demo-fixtures.json';
import { getSpace, spaceIdForTag } from '@/lib/core';

import { configuredTags, nfcMode, sdmKeys } from './config';
import { extractSunFields, verifySun, type SunResult } from './ntag424';
import { replayStore } from './replay';
import { mintSession } from './session';
import type { TapResponse } from './types';

const DEMO = { id: fixtures.location.id, name: fixtures.location.name };

export function locationName(locationId: string): { id: string; name: string } {
  return locationId === DEMO.id ? DEMO : { id: locationId, name: locationId };
}

async function spaceName(locationId: string): Promise<{ id: string; name: string }> {
  const space = await getSpace(locationId).catch(() => undefined);
  return space ? { id: space.id, name: space.name } : locationName(locationId);
}

/** Pure verification, no side effects. Shared by redeem and the operator inspect route. */
export function inspectTap(rawUrlOrQuery: string): { sun: SunResult; locationId?: string; factoryKeys: boolean } {
  const { keys, factory } = sdmKeys();
  const fields = extractSunFields(rawUrlOrQuery);
  const sun: SunResult = fields ? verifySun(fields, keys) : { ok: false, reason: 'malformed' };
  const locationId = sun.ok ? configuredTags().get(sun.uid) : undefined;
  return { sun, locationId, factoryKeys: factory };
}

export async function redeemTap(rawUrlOrQuery: string): Promise<TapResponse> {
  if (nfcMode() === 'simulated') {
    return {
      status: 'simulated',
      message: 'DEMO / NFC simulation. This chat was opened without cryptographic chip verification.',
      location: DEMO,
    };
  }

  const inspected = inspectTap(rawUrlOrQuery);
  const { sun, factoryKeys } = inspected;
  // Env NFC_TAGS wins; otherwise use the chip links an operator set in /admin/spaces (Core).
  let locationId = inspected.locationId;
  if (sun.ok && !locationId) locationId = await spaceIdForTag(sun.uid).catch(() => undefined);
  const base = { factoryKeys, replayProtection: replayStore().durable ? ('durable' as const) : ('memory-best-effort' as const) };

  if (!sun.ok) {
    return sun.reason === 'not_configured'
      ? { ...base, status: 'unconfigured', message: 'This tag has no secure message enabled, so the scan cannot be verified. You can still ask for help.' }
      : { ...base, status: 'invalid', message: 'We could not verify this scan. You can still ask for help, but it will be marked unverified.' };
  }
  if (!locationId) {
    return { ...base, status: 'unlinked', message: 'This is a valid SIGNAL chip, but it is not assigned to a room yet. Ask an operator to link it.' };
  }
  if ((await replayStore().consume(sun.uid, sun.counter)) === 'replayed') {
    return { ...base, status: 'replayed', message: 'This tap was already used. Tap the chip again.' };
  }

  return {
    ...base,
    status: 'verified',
    message: 'NFC scan authenticated. The chip produced a valid message; this does not identify who scanned it.',
    location: await spaceName(locationId),
    sessionToken: mintSession(locationId, true),
  };
}
