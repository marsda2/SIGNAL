// Client-safe helper for src/app/t.tsx. No secrets, no server imports.
// Call `redeem` from an explicit "Continue" press, NEVER on mount: GET /t must stay side-effect free
// (link previews and scanners prefetch it).

import { useCallback, useState } from 'react';

import { visitorHeaders } from '@/lib/visitor-session';

import type { TapResponse } from './types';

/** Shape-only diagnosis returned by /api/tap/redeem (UID only for operators). */
export type TapDiag = {
  mode: 'verified' | 'simulated';
  params: { name: string; length: number; hex: boolean }[];
  fieldsFound: boolean;
  trailingUidTemplate: boolean;
  sun: string;
  factoryKeys: boolean;
  uid?: string;
  counter?: number;
  linkedVia?: 'env' | 'admin' | null;
  hint: string;
};

export type RedeemResult = TapResponse & { diag?: TapDiag };

export type RedeemState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | { phase: 'done'; result: RedeemResult; http: number }
  | { phase: 'error'; message: string; http?: number; diag?: TapDiag };

/** The tap's original query string. On web we send it untouched so the server sees exactly what the chip wrote. */
export function tapQuery(params: Record<string, string | string[] | undefined>): string {
  const search = typeof window !== 'undefined' ? window.location?.search : undefined;
  if (search && search.length > 1) return search;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (typeof v === 'string') q.set(k, v);
  return `?${q.toString()}`;
}

/** `params` is the useLocalSearchParams() object from /t, e.g. { e, c }. */
export function useTapRedeem(params: Record<string, string | string[] | undefined>) {
  const [state, setState] = useState<RedeemState>({ phase: 'idle' });

  const redeem = useCallback(async () => {
    const raw = tapQuery(params);
    setState({ phase: 'pending' });
    try {
      const res = await fetch('/api/tap/redeem', {
        method: 'POST',
        headers: visitorHeaders({ 'content-type': 'application/json' }),
        body: JSON.stringify({ raw }),
      });
      const body = (await res.json().catch(() => ({}))) as RedeemResult & { error?: string; detail?: string };
      console.info('[SIGNAL tap]', res.status, body.status ?? body.error, body.diag ?? '');
      if (!res.ok && !body.status) {
        setState({ phase: 'error', http: res.status, diag: body.diag, message: body.detail ?? `Could not check this tag right now (HTTP ${res.status}${body.error ? `, ${body.error}` : ''}).` });
        return null;
      }
      setState({ phase: 'done', result: body, http: res.status });
      return body;
    } catch (e) {
      console.warn('[SIGNAL tap] network error', e);
      setState({ phase: 'error', message: 'Network problem while checking the tag.' });
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.e, params.c, params.picc_data, params.cmac, params.enc]);

  return { state, redeem };
}
