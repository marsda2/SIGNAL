import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Badge, Button, Card, text } from '@/components/ui';
import { colors, radius, space } from '@/constants/tokens';

type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
type Ticket = {
  key: string;
  assetId: string | null;
  status: Status;
  summary: string;
  reportedAt: string;
  updatedAt: string;
  source: string;
  notes: { at: string; by: string; text: string }[];
};
const STATUSES: Status[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];

/**
 * Owned fake maintenance portal — the ONLY allowlisted target for Anchor Browser (docs/02, docs/06 §E).
 * Reads/writes go through /api/portal/tickets (SurrealDB Core, or the labelled local store), so an
 * Anchor update persists and can be verified by read-after-write.
 */
export default function MaintenancePortal() {
  const { ticket: focus } = useLocalSearchParams<{ ticket?: string }>();
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [backend, setBackend] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/tickets');
      const json = (await res.json()) as { tickets?: Ticket[]; backend?: string; error?: string };
      if (!res.ok || !json.tickets) throw new Error(json.error ?? `HTTP ${res.status}`);
      setTickets(focus ? [...json.tickets].sort((a) => (a.key === focus ? -1 : 0)) : json.tickets);
      setBackend(json.backend ?? '');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [focus]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Badge label="DEMO PORTAL · synthetic data" tone="warn" />
        {backend ? <Badge label={backend === 'surrealdb' ? 'SurrealDB Core' : 'local store (not durable)'} tone={backend === 'surrealdb' ? 'ok' : 'warn'} /> : null}
      </View>
      <Text style={text.h1}>Maintenance tickets</Text>
      {error && <Text style={[text.body, { color: colors.alert }]}>Could not load tickets: {error}</Text>}
      {!tickets && !error && <Text style={text.muted}>Loading…</Text>}
      {tickets?.map((t) => <TicketCard key={t.key} ticket={t} focused={t.key === focus} onSaved={load} />)}
    </ScrollView>
  );
}

function TicketCard({ ticket, focused, onSaved }: { ticket: Ticket; focused: boolean; onSaved: () => void }) {
  const [status, setStatus] = useState<Status>(ticket.status);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function save() {
    setState('saving');
    try {
      const res = await fetch(`/api/portal/tickets/${encodeURIComponent(ticket.key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState('saved');
      setNote('');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }

  return (
    <Card style={focused ? { borderColor: colors.signal, borderWidth: 2 } : undefined}>
      <View nativeID={`ticket-${ticket.key}`} style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={text.h2}>Ticket {ticket.key}</Text>
          <Badge label={ticket.status} tone={ticket.status === 'RESOLVED' ? 'ok' : 'warn'} />
        </View>
        <Text style={text.body}>{ticket.summary}</Text>
        <Text style={text.muted}>
          {ticket.assetId ?? 'unknown asset'} · reported {ticket.reportedAt} · updated {ticket.updatedAt} · via {ticket.source}
        </Text>
        {ticket.notes.map((n) => (
          <Text key={n.at} style={text.mono}>
            {n.at} · {n.by}: {n.text}
          </Text>
        ))}
        <Text style={text.muted}>Set status</Text>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }} accessibilityRole="radiogroup">
          {STATUSES.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="radio"
              accessibilityState={{ selected: status === s }}
              accessibilityLabel={s}
              onPress={() => setStatus(s)}
              style={[styles.chip, status === s && styles.chipOn]}>
              <Text style={{ color: colors.ink, fontWeight: status === s ? '800' : '500' }}>{s}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          accessibilityLabel={`Note for ticket ${ticket.key}`}
          placeholderTextColor={colors.muted}
          style={styles.input}
          multiline
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Button testID={`save-${ticket.key}`} label="Save update" onPress={save} disabled={state === 'saving'} />
          {state === 'saving' && <Text style={text.muted}>Saving…</Text>}
          {state === 'saved' && <Text style={[text.body, { fontWeight: '700' }]}>Saved</Text>}
          {state === 'error' && <Text style={{ color: colors.alert }}>Save failed: {err}</Text>}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 99, paddingHorizontal: space.md, minHeight: 36, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.signal, borderColor: colors.signal },
  input: { minHeight: 64, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: space.sm, color: colors.ink, backgroundColor: colors.surface },
});
