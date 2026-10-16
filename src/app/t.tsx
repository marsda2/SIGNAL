import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Badge, Button, Card, Screen, text } from '@/components/ui';
import { colors, space } from '@/constants/tokens';
import { tapQuery, useTapRedeem, type TapDiag } from '@/lib/nfc/client';
import type { TapStatus } from '@/lib/nfc/types';
import { saveVisitorSession, visitorHeaders } from '@/lib/visitor-session';

const BADGE: Record<TapStatus, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  verified: { label: 'Secure NFC scan checked', tone: 'ok' },
  simulated: { label: 'DEMO / NFC simulation', tone: 'warn' },
  replayed: { label: 'Tap already used', tone: 'warn' },
  invalid: { label: 'Unverified scan', tone: 'alert' },
  unconfigured: { label: 'Unverified scan', tone: 'alert' },
  unlinked: { label: 'Chip not linked to a space', tone: 'warn' },
  rate_limited: { label: 'Too many taps', tone: 'alert' },
};

/** Param names + lengths only — the one-time values are never shown. */
function localShapes(raw: string) {
  const q = raw.startsWith('?') ? raw.slice(1) : raw;
  const out: { name: string; length: number; hex: boolean }[] = [];
  new URLSearchParams(q.replace(/\?/g, '&')).forEach((v, name) => out.push({ name, length: v.length, hex: /^[0-9a-f]+$/i.test(v) }));
  return out;
}

/**
 * NFC landing. Rendering this page MUST NOT consume a scan (no side effects on GET): link previews and
 * scanners prefetch it. The SUN message is redeemed only when the visitor presses Continue.
 */
export default function TapLanding() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, redeem } = useTapRedeem(params);
  const raw = useMemo(() => tapQuery(params), [params]);
  const shapes = useMemo(() => localShapes(raw), [raw]);
  const hasChipData = shapes.length > 0;
  const operator = Boolean(visitorHeaders()['x-demo-secret']);
  const [showDetails, setShowDetails] = useState(false);

  async function onContinue() {
    const r = await redeem();
    if (r?.status === 'verified' && r.sessionToken && r.location) {
      saveVisitorSession(r.sessionToken);
      // replace() drops the one-time e/c values from history; the token stays in this tab's storage, not the URL.
      router.replace({ pathname: '/s/[session]', params: { session: r.location.id } });
    } else if (r?.status === 'simulated') {
      router.replace({ pathname: '/s/[session]', params: { session: 'demo' } });
    } else {
      setShowDetails(true);
    }
  }

  const result = state.phase === 'done' ? state.result : null;
  const diag: TapDiag | undefined = state.phase === 'done' ? state.result.diag : state.phase === 'error' ? state.diag : undefined;
  const http = state.phase === 'done' || state.phase === 'error' ? state.http : undefined;

  return (
    <Screen style={{ maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Card>
        {result ? <Badge label={BADGE[result.status].label} tone={BADGE[result.status].tone} /> : null}
        <Text style={text.h1}>{hasChipData ? 'Need a hand here?' : 'Tap the SIGNAL chip'}</Text>
        <Text style={text.body}>
          {hasChipData
            ? 'Ask about the equipment or report a problem. No account needed.'
            : 'Hold your phone near the SIGNAL tag in the space to open its helper. This page only works from a chip tap.'}
        </Text>
        {result ? <Text style={text.muted}>{result.message}</Text> : null}
        {result?.factoryKeys && result.status === 'verified' ? <Text style={text.mono}>Chip uses factory keys (demo only).</Text> : null}
        {state.phase === 'error' ? <Text style={[text.body, { color: colors.alert }]}>{state.message}</Text> : null}
        {diag && diag.sun !== 'ok' ? <Text style={text.muted}>{diag.hint}</Text> : null}
      </Card>

      {hasChipData && (!result || result.status === 'verified' || result.status === 'simulated') && (
        <Button label={state.phase === 'pending' ? 'Checking the chip…' : 'Continue'} onPress={onContinue} disabled={state.phase === 'pending'} />
      )}
      {result && ['replayed', 'invalid', 'unconfigured'].includes(result.status) ? <Text style={text.body}>Tap the chip again to get a fresh link.</Text> : null}

      {operator && hasChipData ? <LinkChip raw={raw} /> : null}

      {hasChipData && (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails((s) => !s)} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={[text.muted, { textDecorationLine: 'underline' }]}>{showDetails ? 'Hide tap details' : 'Tap details (for staff)'}</Text>
        </Pressable>
      )}
      {showDetails && (
        <Card>
          <Text style={text.mono}>Chip sent: {shapes.map((s) => `${s.name}(${s.length}${s.hex ? ' hex' : ''})`).join(', ') || 'nothing'}</Text>
          <Text style={text.mono}>Expected: e(32 hex) + c(16 hex)</Text>
          {http !== undefined ? <Text style={text.mono}>Server: HTTP {http}{result ? ` · ${result.status}` : ''}</Text> : <Text style={text.mono}>Server: not asked yet (press Continue)</Text>}
          {diag ? (
            <>
              <Text style={text.mono}>Mode: {diag.mode} · e/c found: {diag.fieldsFound ? 'yes' : 'no'} · check: {diag.sun}{diag.factoryKeys ? ' · factory keys' : ''}</Text>
              {diag.trailingUidTemplate ? <Text style={text.mono}>TagWriter “?uid=000…” leftover present (ignored)</Text> : null}
              {diag.sun === 'ok' ? <Text style={text.mono}>Linked: {diag.linkedVia ?? 'no'}{diag.uid ? ` · UID ${diag.uid} · counter ${diag.counter}` : ''}</Text> : null}
              <Text style={text.muted}>{diag.hint}</Text>
            </>
          ) : null}
        </Card>
      )}
    </Screen>
  );
}

type SpaceRow = { id: string; name: string; nfcTags: string[] };

/** Operator-only: link the chip that was just tapped to a space. Checking for the link does not use up the tap. */
function LinkChip({ raw }: { raw: string }) {
  const [spaces, setSpaces] = useState<SpaceRow[] | null>(null);
  const [spaceId, setSpaceId] = useState('pitch_area');
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ ok: boolean; text: string; envLine?: string } | null>(null);

  useEffect(() => {
    fetch('/api/spaces', { headers: visitorHeaders() })
      .then((r) => r.json() as Promise<{ spaces?: SpaceRow[] }>)
      .then((j) => setSpaces(j.spaces ?? []))
      .catch(() => setSpaces([]));
  }, []);

  async function link() {
    setBusy(true);
    try {
      const res = await fetch('/api/nfc/link', { method: 'POST', headers: visitorHeaders({ 'content-type': 'application/json' }), body: JSON.stringify({ raw, spaceId }) });
      const j = (await res.json()) as { uid?: string; space?: { name: string }; note?: string; envLine?: string; detail?: string; error?: string; mode?: string };
      if (!res.ok || !j.uid) throw new Error(j.detail ?? j.error ?? `HTTP ${res.status}`);
      setOut({ ok: true, text: `Linked chip ${j.uid} to ${j.space?.name}. ${j.note ?? ''}${j.mode === 'simulated' ? ' Note: the server is in NFC_MODE=simulated, so taps are not verified until NFC_MODE=verified.' : ''}`, envLine: j.envLine });
    } catch (e) {
      setOut({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Badge label="Operator" tone="warn" />
      <Text style={text.h2}>Link this chip to a space</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {(spaces ?? []).map((s) => (
          <Pressable
            key={s.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: spaceId === s.id }}
            onPress={() => setSpaceId(s.id)}
            style={{ minHeight: 40, paddingHorizontal: space.md, justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: spaceId === s.id ? colors.signal : colors.line, backgroundColor: spaceId === s.id ? colors.signal : 'transparent' }}>
            <Text>{s.name}</Text>
          </Pressable>
        ))}
        {spaces && !spaces.length ? <Text style={text.muted}>Could not load spaces (check the operator secret in /admin/spaces).</Text> : null}
      </View>
      <Button label={busy ? 'Linking…' : 'Link chip'} onPress={link} disabled={busy} />
      {out ? <Text style={[text.body, { color: out.ok ? colors.ink : colors.alert }]}>{out.text}</Text> : null}
      {out?.envLine ? <Text style={text.mono} selectable>{out.envLine}</Text> : null}
    </Card>
  );
}
