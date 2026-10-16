import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Badge, Button, Card, text } from '@/components/ui';
import { space } from '@/constants/tokens';

type Health = {
  configured: Record<string, boolean>;
  flags: Record<string, boolean | string>;
  live: { agentMemory: { ok: boolean; error?: string } };
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
      {error && <Text style={text.body}>Could not load status: {error}</Text>}
      {health && (
        <Card>
          {Object.entries(health.configured).map(([name, ok]) => (
            <View key={name} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={text.body}>{name}</Text>
              <Badge label={ok ? 'configured' : 'missing'} tone={ok ? 'ok' : 'warn'} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={text.body}>Agent Memory live check</Text>
            <Badge label={health.live.agentMemory.ok ? 'reachable' : (health.live.agentMemory.error ?? 'down')} tone={health.live.agentMemory.ok ? 'ok' : 'alert'} />
          </View>
          <Text style={text.mono}>checked {health.time}</Text>
        </Card>
      )}
      <Button label="Refresh" onPress={load} />
    </ScrollView>
  );
}
