import { ScrollView, Text, View } from 'react-native';

import fixtures from '@/data/demo-fixtures.json';
import { Badge, Card, text } from '@/components/ui';
import { space } from '@/constants/tokens';

/**
 * Owned fake maintenance portal — the ONLY allowlisted target for Anchor Browser (docs/02, docs/06 §E).
 * TODO: back with SurrealDB Core so an Anchor update persists and can be verified by read-after-write.
 * Until then this renders the synthetic fixtures read-only.
 */
export default function MaintenancePortal() {
  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Badge label="DEMO PORTAL · synthetic data" tone="warn" />
      <Text style={text.h1}>Tickets</Text>
      {fixtures.incidents.map((i) => (
        <Card key={i.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={text.h2}>{i.id}</Text>
            <Badge label={i.status} tone={i.status === 'OPEN' ? 'warn' : 'ok'} />
          </View>
          <Text style={text.body}>{i.summary}</Text>
          <Text style={text.muted}>
            {i.assetId} · reported {i.reportedAt}
          </Text>
        </Card>
      ))}
    </ScrollView>
  );
}
