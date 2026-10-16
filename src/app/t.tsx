import { useRouter } from 'expo-router';
import { Text } from 'react-native';

import { Badge, Button, Card, Screen, text } from '@/components/ui';
import { DEMO_LOCATION } from '@/constants/tokens';

/**
 * NFC landing. Rendering this page MUST NOT consume a scan (no side effects on GET).
 * Real SUN/SDM verification belongs in POST /api/tap/redeem (docs/03_NFC_SECURITY.md); until then
 * the page is explicitly labelled as a simulation.
 */
export default function TapLanding() {
  const router = useRouter();
  return (
    <Screen style={{ maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Card>
        <Badge label="DEMO / NFC simulation" tone="warn" />
        <Text style={text.h1}>Need help in {DEMO_LOCATION.name}?</Text>
        <Text style={text.body}>Ask about the equipment or report a problem. No account needed.</Text>
        <Text style={text.muted}>Location not verified. You can still ask for help.</Text>
      </Card>
      <Button label="Continue" onPress={() => router.push({ pathname: '/s/[session]', params: { session: 'demo' } })} />
    </Screen>
  );
}
