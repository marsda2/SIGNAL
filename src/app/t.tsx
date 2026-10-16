import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Badge, Button, Card, Screen, text } from '@/components/ui';
import { useTapRedeem } from '@/lib/nfc/client';
import type { TapStatus } from '@/lib/nfc/types';
import { saveVisitorSession } from '@/lib/visitor-session';

const BADGE: Record<TapStatus, { label: string; tone: 'ok' | 'warn' | 'alert' }> = {
  verified: { label: 'Secure NFC scan checked', tone: 'ok' },
  simulated: { label: 'DEMO / NFC simulation', tone: 'warn' },
  replayed: { label: 'Tap already used', tone: 'warn' },
  invalid: { label: 'Unverified scan', tone: 'alert' },
  unconfigured: { label: 'Unverified scan', tone: 'alert' },
  unlinked: { label: 'Chip not linked to a space', tone: 'warn' },
  rate_limited: { label: 'Too many taps', tone: 'alert' },
};

/**
 * NFC landing. Rendering this page MUST NOT consume a scan (no side effects on GET): link previews and
 * scanners prefetch it. The SUN message is redeemed only when the visitor presses Continue.
 */
export default function TapLanding() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { state, redeem } = useTapRedeem(params);
  const hasChipData = Boolean(params.e || params.picc_data || params.enc) && Boolean(params.c || params.cmac);

  async function onContinue() {
    const r = await redeem();
    if (r?.status === 'verified' && r.sessionToken && r.location) {
      saveVisitorSession(r.sessionToken);
      // replace() drops the one-time e/c values from history; the token stays in this tab's storage, not the URL.
      router.replace({ pathname: '/s/[session]', params: { session: r.location.id } });
    } else if (r?.status === 'simulated') {
      router.replace({ pathname: '/s/[session]', params: { session: 'demo' } });
    }
  }

  const result = state.phase === 'done' ? state.result : null;
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
        {state.phase === 'error' ? <Text style={text.muted}>{state.message}</Text> : null}
      </Card>
      {hasChipData && (!result || result.status === 'verified' || result.status === 'simulated') && (
        <Button label={state.phase === 'pending' ? 'Checking the chip…' : 'Continue'} onPress={onContinue} disabled={state.phase === 'pending'} />
      )}
      {result && ['replayed', 'invalid', 'unconfigured'].includes(result.status) ? <Text style={text.body}>Tap the chip again to get a fresh link.</Text> : null}
    </Screen>
  );
}
