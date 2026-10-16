// Client-safe types shared by the redeem API and screens. No server imports here.

/** Verification outcomes from docs/03_NFC_SECURITY.md plus `unlinked` (valid chip, no location) and `simulated`. */
export type TapStatus = 'verified' | 'replayed' | 'invalid' | 'unconfigured' | 'unlinked' | 'simulated' | 'rate_limited';

export type TapResponse = {
  status: TapStatus;
  /** Honest copy for the UI; never claims presence or identity. */
  message: string;
  location?: { id: string; name: string };
  /** Signed, short-lived, location-scoped. Only present when status === 'verified'. */
  sessionToken?: string;
  /** True while the chip still uses factory-default AES keys (forgeable by anyone who knows them). */
  factoryKeys?: boolean;
  /** Replay protection is per server instance until the Core DB store lands. */
  replayProtection?: 'memory-best-effort' | 'durable';
};
