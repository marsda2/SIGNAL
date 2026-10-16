import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pip } from '@/components/Pip';
import { Badge, Button, Card, text } from '@/components/ui';
import type { ChatEvent, PipState } from '@/lib/agent/contracts';
import { colors, DEMO_LOCATION, radius, space } from '@/constants/tokens';

type Item =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'pip'; text: string }
  | { id: string; kind: 'source'; title: string; text: string; occurredAt?: string }
  | { id: string; kind: 'notice'; text: string };

let counter = 0;
const nextId = () => String(++counter);

export default function Chat() {
  const [items, setItems] = useState<Item[]>([
    { id: nextId(), kind: 'pip', text: 'Hey there! I’m Pip. Need a hand with something in this room?' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pip, setPip] = useState<PipState>('idle');

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);
    setPip('thinking');
    setItems((prev) => [...prev, { id: nextId(), kind: 'user', text: message }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, locationId: DEMO_LOCATION.id }),
      });
      if (!res.ok) throw new Error(`Chat failed (${res.status})`);
      const { events } = (await res.json()) as { events: ChatEvent[] };
      const added: Item[] = [];
      let nextPip: PipState = 'idle';
      for (const e of events) {
        if (e.type === 'avatar') nextPip = e.state;
        else if (e.type === 'text') added.push({ id: nextId(), kind: 'pip', text: e.text });
        else if (e.type === 'source') added.push({ id: nextId(), kind: 'source', title: e.title, text: e.text, occurredAt: e.occurredAt });
        else if (e.type === 'notice') added.push({ id: nextId(), kind: 'notice', text: e.message });
      }
      setItems((prev) => [...prev, ...added]);
      setPip(nextPip);
    } catch (e) {
      setItems((prev) => [...prev, { id: nextId(), kind: 'notice', text: e instanceof Error ? e.message : String(e) }]);
      setPip('idle');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pip state={pip} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={text.h2}>{DEMO_LOCATION.name}</Text>
          <Badge label="DEMO / NFC simulation" tone="warn" />
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ gap: space.sm, padding: space.md }}
        renderItem={({ item }) => {
          if (item.kind === 'user') return <Text style={[styles.bubble, styles.user]}>{item.text}</Text>;
          if (item.kind === 'pip') return <Text style={[styles.bubble, styles.pip]}>{item.text}</Text>;
          if (item.kind === 'notice') return <Text style={styles.notice}>{item.text}</Text>;
          return (
            <Card style={{ padding: space.sm }}>
              <Text style={text.muted}>
                From memory · {item.title}
                {item.occurredAt ? ` · ${item.occurredAt}` : ''}
              </Text>
              <Text style={text.body}>{item.text}</Text>
            </Card>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          placeholder="The projector isn’t showing my laptop…"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Message Pip"
          returnKeyType="send"
        />
        <Button label={busy ? '…' : 'Send'} onPress={send} disabled={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  bubble: { padding: space.md, borderRadius: radius.md, maxWidth: '85%', fontSize: 16, lineHeight: 22, overflow: 'hidden' },
  user: { alignSelf: 'flex-end', backgroundColor: colors.ink, color: colors.surface },
  pip: { alignSelf: 'flex-start', backgroundColor: colors.surface, color: colors.ink, borderWidth: 1, borderColor: colors.line },
  notice: { color: colors.alert, fontSize: 13, lineHeight: 18 },
  composer: { flexDirection: 'row', gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'center' },
  input: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, backgroundColor: colors.surface, color: colors.ink },
});
