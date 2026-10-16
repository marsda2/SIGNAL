import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Badge, Button, Card, text } from '@/components/ui';
import { colors, space } from '@/constants/tokens';
import { Link } from 'expo-router';

type Health = {
  configured: Record<string, boolean>;
  flags: Record<string, boolean | string>;
  live: Record<string, { ok: boolean; error?: string; backend?: string }>;
  model?: string;
  time: string;
};

/** Operator overview. Right now: an honest integration status board (no seeded success states). */
export default function Admin() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      setHealth((await res.json()) as Health);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <Text style={text.h1}>Integrations</Text>
      <Link href="/admin/spaces" style={{ color: colors.ink, fontWeight: '700', textDecorationLine: 'underline' }}>
        Manage spaces, FAQs, escalation contacts and NFC chips →
      </Link>
      {error && <Text style={text.body}>Could not load status: {error}</Text>}
      {health && (
        <Card>
          {Object.entries(health.configured).map(([name, ok]) => (
            <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={text.body}>{name}</Text>
              <Badge label={ok ? 'configured' : 'missing'} tone={ok ? 'ok' : 'warn'} />
            </View>
          ))}
          {Object.entries(health.live).map(([name, probe]) => (
            <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={text.body}>
                {name} live check{probe.backend ? ` (${probe.backend})` : ''}
              </Text>
              <Badge label={probe.ok ? (probe.backend === 'local' ? 'local store' : 'reachable') : (probe.error ?? 'down')} tone={probe.ok ? (probe.backend === 'local' ? 'warn' : 'ok') : 'alert'} />
            </View>
          ))}
          {health.model && <Text style={text.mono}>model {health.model}</Text>}
          <Text style={text.mono}>checked {health.time}</Text>
        </Card>
      )}
      <Button label="Refresh" onPress={load} />
    </ScrollView>
  );
}
