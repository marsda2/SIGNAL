import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Badge, Button, Card, text } from '@/components/ui';
import { colors, space } from '@/constants/tokens';
import { visitorHeaders } from '@/lib/visitor-session';

type Mail = { key: string; spaceId: string; incidentKey: string; reference: string; to: string; subject: string; text: string; at: string };

/** Operator view of the demo facilities inbox (EMAIL_MODE=demo). Uses the operator secret saved in /admin/spaces. */
export default function DemoInbox() {
  const [mails, setMails] = useState<Mail[] | null>(null);
  const [meta, setMeta] = useState<{ mode: string; backend: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/demo/inbox', { headers: visitorHeaders() });
      if (res.status === 403) throw new Error('Operator only — enter the operator secret in /admin/spaces (same tab) first.');
      const json = (await res.json()) as { emails?: Mail[]; mode?: string; backend?: string; error?: string };
      if (!json.emails) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMails(json.emails);
      setMeta({ mode: json.mode ?? '?', backend: json.backend ?? '?' });
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
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Badge label="DEMO INBOX · no real email is sent" tone="warn" />
        {meta ? <Badge label={`mode ${meta.mode} · ${meta.backend}`} tone="neutral" /> : null}
      </View>
      <Text style={text.h1}>Facilities inbox</Text>
      {error ? (
        <Card>
          <Text style={[text.body, { color: colors.alert }]}>{error}</Text>
          <Link href="/admin/spaces" style={{ color: colors.ink, fontWeight: '700', textDecorationLine: 'underline' }}>
            Open /admin/spaces →
          </Link>
        </Card>
      ) : null}
      {mails && !mails.length ? <Text style={text.muted}>No emails yet. Approve “Email the facilities team” in a chat.</Text> : null}
      {mails?.map((m) => (
        <Card key={m.key}>
          <Text style={text.h2}>{m.subject}</Text>
          <Text style={text.mono}>
            {m.at} · to {m.to} · {m.spaceId} · ref {m.reference}
          </Text>
          <Text style={text.body}>{m.text}</Text>
        </Card>
      ))}
      <Button label="Refresh" onPress={load} />
    </ScrollView>
  );
}
