// Server-only NFC configuration. Keys come from env (AES keys never leave the server, never EXPO_PUBLIC_).

import { FACTORY_KEY, parseKey, type SunKeys } from './ntag424';

export function nfcMode(): 'verified' | 'simulated' {
  return process.env.NFC_MODE === 'verified' ? 'verified' : 'simulated';
}

/**
 * NFC_SDM_META_KEY / NFC_SDM_FILE_KEY: 32 hex each. Unset means the chip still has factory keys (all zeros),
 * which is fine for bring-up but forgeable, so `factory` is surfaced to the UI and /api/health.
 */
export function sdmKeys(): { keys: SunKeys; factory: boolean } {
  const meta = process.env.NFC_SDM_META_KEY?.trim();
  const file = process.env.NFC_SDM_FILE_KEY?.trim();
  return {
    keys: { meta: meta ? parseKey(meta) : FACTORY_KEY, file: file ? parseKey(file) : FACTORY_KEY },
    factory: !meta || !file,
  };
}

/** NFC_TAGS="04DE5F1EACC040=room204,04AABBCCDDEE11=room205" — chip UID -> location id. */
export function configuredTags(): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (process.env.NFC_TAGS ?? '').split(',')) {
    const [uid, locationId] = pair.split('=').map((s: string) => s.trim());
    if (uid && locationId && /^[0-9a-f]{14}$/i.test(uid)) map.set(uid.toUpperCase(), locationId);
  }
  return map;
}
