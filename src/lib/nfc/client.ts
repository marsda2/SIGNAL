// Client-safe helper for src/app/t.tsx. No secrets, no server imports.
// Call `redeem` from an explicit "Continue" press, NEVER on mount: GET /t must stay side-effect free
// (link previews and scanners prefetch it).

import { useCallback, useState } from 'react';

import type { TapResponse } from './types';

export type RedeemState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | { phase: 'done'; result: TapResponse }
  | { phase: 'error'; message: string };

/** `params` is the useLocalSearchParams() object from /t, e.g. { e, c }. */
export function useTapRedeem(params: Record<string, string | string[] | undefined>) {
  const [state, setState] = useState<RedeemState>({ phase: 'idle' });

  const redeem = useCallback(async () => {
    const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
    const e = first(params.e) ?? first(params.picc_data) ?? first(params.enc) ?? '';
    const c = first(params.c) ?? first(params.cmac) ?? '';
    setState({ phase: 'pending' });
    try {
      const res = await fetch('/api/tap/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ e, c }),
      });
      const body = (await res.json()) as TapResponse & { error?: string; detail?: string };
      if (!res.ok && !body.status) {
        setState({ phase: 'error', message: body.detail ?? 'Could not check this tag right now.' });
        return null;
      }
      setState({ phase: 'done', result: body });
      return body;
    } catch {
      setState({ phase: 'error', message: 'Network problem while checking the tag.' });
      return null;
    }
  }, [params.e, params.c, params.picc_data, params.cmac, params.enc]);

  return { state, redeem };
}
