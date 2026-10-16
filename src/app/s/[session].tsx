import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Pip } from '@/components/Pip';
import { Badge, Card, text } from '@/components/ui';
import { ChatBubble, Composer, EscalationCard, StatusMark, type StatusKind } from '@/design';
import type { ChatEvent, CueName, EscalationOption, FaqPreset, IncidentView, PipState, PublicSpace } from '@/lib/agent/contracts';
import { colors, DEMO_LOCATION, space } from '@/constants/tokens';
import { visitorHeaders } from '@/lib/visitor-session';

type Approval = Extract<ChatEvent, { type: 'approval' }>;
type Attempt = { key: string; state: string; liveViewUrl?: string | null; evidence?: string | null; error?: string | null; incidentKey: string };

type Item =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'pip'; text: string; solvable?: boolean }
  | { id: string; kind: 'source'; title: string; text: string; occurredAt?: string }
  | { id: string; kind: 'notice'; text: string }
  | { id: string; kind: 'caption'; text: string }
  | { id: string; kind: 'incident'; incident: IncidentView; relation: string }
  | { id: string; kind: 'approval'; approval: Approval; status: 'offered' | 'working' | 'done' | 'declined' }
  | { id: string; kind: 'action'; attempt: Attempt }
  | { id: string; kind: 'seen'; incident: IncidentView; agoText: string; assetName: string }
  | { id: string; kind: 'escalation'; reason: string; urgent: boolean; options: EscalationOption[] };

let counter = 0;
const nextId = () => String(++counter);

const CUE_CAPTION: Record<CueName, string> = {
  greeting: 'Pip says hi.',
  thinking: 'Pip is checking.',
  solved: 'Pip celebrates: solved!',
  escalating: 'Pip is getting this reported.',
  safety: 'Safety alert.',
};

function playCue(cue: CueName) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioCtor = (window as unknown as { Audio?: new (src: string) => { play: () => Promise<void> } }).Audio;
    if (AudioCtor) new AudioCtor(`/audio/${cue}.mp3`).play().catch(() => undefined);
  } catch {
    /* audio is optional; captions always render */
  }
}

const GREETING_ID = 'greeting';

export default function Chat() {
  const { session: ref } = useLocalSearchParams<{ session?: string }>();
  const [room, setRoom] = useState<PublicSpace | null>(null);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [presets, setPresets] = useState<FaqPreset[]>([]);
  /** Set when the space only opens from a verified chip tap and this tab has no valid tap session. */
  const [locked, setLocked] = useState<string | null>(null);
  const [via, setVia] = useState<'nfc' | 'open' | 'operator' | null>(null);
  const spaceId = room?.id ?? DEMO_LOCATION.id;
  const [items, setItems] = useState<Item[]>([
    { id: GREETING_ID, kind: 'pip', text: 'Hey there! I’m Pip. Need a hand with something here?' },
  ]);

  // Which space is this chat for? The tab's tap session (header) decides; otherwise the space id in the URL or "demo".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/spaces/resolve?ref=${encodeURIComponent(String(ref ?? 'demo'))}`, { headers: visitorHeaders() });
        const json = (await res.json()) as { space?: PublicSpace; verified?: boolean; via?: 'nfc' | 'open' | 'operator'; error?: string; message?: string; spaceName?: string };
        if (cancelled) return;
        if (res.status === 401 && json.error === 'nfc_required') {
          setLocked(json.spaceName ?? 'this space');
          return;
        }
        if (!res.ok || !json.space) throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
        setRoom(json.space);
        setVerified(Boolean(json.verified));
        setVia(json.via ?? null);
        setItems((prev) => prev.map((i) => (i.id === GREETING_ID ? { ...i, text: `Hey there! I’m Pip. Need a hand with something in ${json.space!.name}?` } : i)));
        const faq = await fetch(`/api/spaces/${encodeURIComponent(json.space.id)}/faq`, { headers: visitorHeaders() }).then((r) => r.json() as Promise<{ presets?: FaqPreset[] }>);
        if (!cancelled) setPresets(faq.presets ?? []);
      } catch (e) {
        if (!cancelled) setSpaceError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ref]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pip, setPip] = useState<PipState>('idle');
  const [bandW, setBandW] = useState(0);
  // Horizontal range = half the band minus Pip's width; vertical is tiny. Stable object so Pip's roam effect doesn't restart.
  const bandRoam = useMemo(() => ({ x: Math.max(0, bandW / 2 - 36), y: 4 }), [bandW]);
  const [sound, setSound] = useState(false);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const lastProblem = useRef('');

  const add = (...more: Item[]) => setItems((prev) => [...prev, ...more]);
  const patch = (id: string, fn: (i: Item) => Item) => setItems((prev) => prev.map((i) => (i.id === id ? fn(i) : i)));

  function cue(c: CueName, caption?: string) {
    add({ id: nextId(), kind: 'caption', text: `🔊 ${caption ?? CUE_CAPTION[c]}` });
    if (soundRef.current) playCue(c);
  }

  function history() {
    return items
      .filter((i): i is Extract<Item, { kind: 'user' | 'pip' }> => i.kind === 'user' || i.kind === 'pip')
      .slice(-10)
      .map((i) => ({ role: i.kind === 'user' ? ('visitor' as const) : ('pip' as const), text: i.text }));
  }

  async function send(preset?: string) {
    const message = (preset ?? input).trim();
    if (!message || busy) return;
    if (!preset) setInput('');
    setBusy(true);
    setPip('thinking');
    if (!lastProblem.current) lastProblem.current = message;
    add({ id: nextId(), kind: 'user', text: message });
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: visitorHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message, locationId: spaceId, history: history() }),
      });
      if (!res.ok) throw new Error(`Chat failed (${res.status})`);
      const { events } = (await res.json()) as { events: ChatEvent[] };
      const added: Item[] = [];
      let nextPip: PipState = 'idle';
      const done = events.find((e): e is Extract<ChatEvent, { type: 'completed' }> => e.type === 'completed');
      for (const e of events) {
        if (e.type === 'avatar') nextPip = e.state;
        else if (e.type === 'text') added.push({ id: nextId(), kind: 'pip', text: e.text, solvable: done?.outcome === 'guide' });
        else if (e.type === 'source') added.push({ id: nextId(), kind: 'source', title: e.title, text: e.text, occurredAt: e.occurredAt });
        else if (e.type === 'notice') added.push({ id: nextId(), kind: 'notice', text: e.message });
        else if (e.type === 'incident') added.push({ id: nextId(), kind: 'incident', incident: e.incident, relation: e.relation });
        else if (e.type === 'approval') added.push({ id: nextId(), kind: 'approval', approval: e, status: 'offered' });
        else if (e.type === 'seen_before') added.push({ id: nextId(), kind: 'seen', incident: e.incident, agoText: e.agoText, assetName: e.assetName });
        else if (e.type === 'escalation') added.push({ id: nextId(), kind: 'escalation', reason: e.reason, urgent: e.urgent, options: e.options });
        else if (e.type === 'cue') {
          added.push({ id: nextId(), kind: 'caption', text: `🔊 ${e.caption}` });
          if (soundRef.current) playCue(e.cue);
        }
      }
      add(...added);
      setPip(nextPip);
    } catch (e) {
      add({ id: nextId(), kind: 'notice', text: e instanceof Error ? e.message : String(e) });
      setPip('idle');
    } finally {
      setBusy(false);
    }
  }

  async function markSolved(item: Extract<Item, { kind: 'pip' }>) {
    patch(item.id, (i) => ({ ...i, solvable: false }) as Item);
    setPip('solved');
    cue('solved');
    add({ id: nextId(), kind: 'pip', text: 'Great — glad that worked! I’ve noted it (as your report, not staff-verified) so the next person gets this fix faster.' });
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: visitorHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ locationId: spaceId, problem: lastProblem.current || 'unspecified', fix: item.text.slice(0, 600) }),
      });
    } catch {
      add({ id: nextId(), kind: 'notice', text: 'Could not save your feedback.' });
    }
  }

  async function approve(item: Extract<Item, { kind: 'approval' }>) {
    const a = item.approval;
    patch(item.id, (i) => ({ ...i, status: 'working' }) as Item);
    try {
      if (a.kind === 'CREATE_INCIDENT') {
        const res = await fetch('/api/incidents', {
          method: 'POST',
          headers: visitorHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ actionId: a.actionId, locationId: spaceId, summary: a.summary ?? lastProblem.current, assetId: a.assetId ?? null }),
        });
        const json = (await res.json()) as { incident?: IncidentView; error?: string; memoryNote?: string; backend?: string };
        if (!res.ok || !json.incident) throw new Error(json.error ?? `HTTP ${res.status}`);
        patch(item.id, (i) => ({ ...i, status: 'done' }) as Item);
        add(
          { id: nextId(), kind: 'incident', incident: json.incident, relation: 'created' },
          { id: nextId(), kind: 'pip', text: `Ticket ${json.incident.key} is saved${json.backend === 'local' ? ' in the local demo store' : ''} with status ${json.incident.status}. Staff haven’t confirmed it yet — I’ll only say help is coming once they do.` },
        );
      } else {
        const res = await fetch('/api/actions/portal-update', {
          method: 'POST',
          headers: visitorHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ actionId: a.actionId, locationId: spaceId, incidentKey: a.incidentKey, summary: a.summary ?? lastProblem.current }),
        });
        const json = (await res.json()) as { attempt?: Attempt; error?: string; message?: string };
        if (!res.ok || !json.attempt) throw new Error(json.message ?? json.error ?? `HTTP ${res.status}`);
        patch(item.id, (i) => ({ ...i, status: 'done' }) as Item);
        const actionItemId = nextId();
        add({ id: actionItemId, kind: 'action', attempt: json.attempt });
        poll(actionItemId, json.attempt.key);
      }
    } catch (e) {
      patch(item.id, (i) => ({ ...i, status: 'offered' }) as Item);
      add({ id: nextId(), kind: 'notice', text: e instanceof Error ? e.message : String(e) });
    }
  }

  function poll(itemId: string, attemptKey: string) {
    const tick = async () => {
      try {
        const res = await fetch(`/api/actions/${encodeURIComponent(attemptKey)}`, { headers: visitorHeaders() });
        const json = (await res.json()) as { attempt?: Attempt; incident?: IncidentView | null };
        if (json.attempt) {
          patch(itemId, (i) => ({ ...i, attempt: json.attempt! }) as Item);
          if (['VERIFIED', 'FAILED', 'PENDING_REVIEW'].includes(json.attempt.state)) {
            if (json.attempt.state === 'VERIFIED') {
              setPip('helping');
              if (json.incident) add({ id: nextId(), kind: 'incident', incident: json.incident, relation: 'linked' });
            }
            return;
          }
        }
      } catch {
        /* keep polling */
      }
      setTimeout(tick, 4000);
    };
    setTimeout(tick, 3000);
  }

  if (locked) {
    return (
      <View style={[styles.root, { justifyContent: 'center', padding: space.lg, gap: space.md }]}>
        <Card>
          <Badge label="NFC tap required" tone="warn" />
          <Text style={text.h2}>Tap the SIGNAL chip in {locked}</Text>
          <Text style={text.body}>This helper only opens from a tap on the chip in this space. Hold your phone near the tag to start.</Text>
          <Text style={text.muted}>Already tapped? Your tap session lasts 30 minutes — tap again for a fresh one.</Text>
        </Card>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        {/* Roaming band: Pip drifts only inside this strip above the title, never over the message list. */}
        <View style={styles.pipBand} onLayout={(e) => setBandW(e.nativeEvent.layout.width)}>
          <Pip state={pip} size={34} roam={bandRoam} />
        </View>
        <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={text.h2}>{room?.name ?? (spaceError ? 'Unknown space' : 'Loading…')}</Text>
          <Badge
            label={verified ? 'Secure NFC scan checked' : via === 'operator' ? 'Operator preview (no tap)' : 'DEMO / NFC simulation'}
            tone={verified ? 'ok' : 'warn'}
          />
          {spaceError ? <Text style={styles.notice}>Could not load this space: {spaceError}</Text> : null}
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: sound }}
          accessibilityLabel="Pip sound cues"
          onPress={() => setSound((s) => !s)}
          style={styles.toggle}>
          <Text style={text.muted}>{sound ? '🔊 Sound on' : '🔈 Sound off'}</Text>
        </Pressable>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ gap: space.sm, padding: space.md }}
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'user':
              return <ChatBubble from="user">{item.text}</ChatBubble>;
            case 'pip':
              return (
                <View style={{ alignItems: 'flex-start', gap: space.xs }}>
                  <ChatBubble from="assistant">{item.text}</ChatBubble>
                  {item.solvable && (
                    <Pressable accessibilityRole="button" onPress={() => markSolved(item)} style={styles.link}>
                      <Text style={styles.linkText}>✓ That fixed it</Text>
                    </Pressable>
                  )}
                </View>
              );
            case 'notice':
              return <Text style={styles.notice}>{item.text}</Text>;
            case 'caption':
              return <Text style={text.mono}>{item.text}</Text>;
            case 'source':
              return (
                <Card style={{ padding: space.sm }}>
                  <Text style={text.muted}>
                    From memory · {item.title}
                    {item.occurredAt ? ` · ${item.occurredAt}` : ''}
                  </Text>
                  <Text style={text.body}>{item.text}</Text>
                </Card>
              );
            case 'incident':
              return (
                <Card style={{ padding: space.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={text.h2}>Ticket {item.incident.key}</Text>
                    <Badge label={item.incident.status} tone={item.incident.status === 'RESOLVED' ? 'ok' : 'warn'} />
                  </View>
                  <Text style={text.body}>{item.incident.summary}</Text>
                  <Text style={text.muted}>
                    {item.relation === 'created' ? 'Created just now' : 'On record'} · updated {item.incident.updatedAt} · source: incident database
                  </Text>
                  {item.incident.lastNote ? <Text style={text.mono}>Latest note: {item.incident.lastNote}</Text> : null}
                </Card>
              );
            case 'approval':
              if (item.status === 'offered' || item.status === 'working') {
                return (
                  <EscalationCard
                    title="Needs your OK"
                    body="Nothing is sent until you tap."
                    approveLabel={item.approval.label}
                    declineLabel="Not now"
                    requesting={item.status === 'working'}
                    requestStatus="Working on it…"
                    onApprove={() => approve(item)}
                    onDecline={() => patch(item.id, (i) => ({ ...i, status: 'declined' }) as Item)}
                  />
                );
              }
              return (
                <Card style={{ padding: space.sm }}>
                  {item.status === 'done' && <Text style={text.body}>✓ Approved</Text>}
                  {item.status === 'declined' && <Text style={text.muted}>Declined — nothing was sent.</Text>}
                </Card>
              );
            case 'action':
              return <ActionCard attempt={item.attempt} />;
            case 'seen':
              return (
                <Card style={{ padding: space.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
                    <Text style={[text.h2, { flex: 1 }]}>Seen before · {item.incident.key}</Text>
                    <Badge label={item.incident.status} tone={item.incident.status === 'RESOLVED' ? 'ok' : 'warn'} />
                  </View>
                  <Text style={text.body}>{item.incident.summary}</Text>
                  <Text style={text.muted}>
                    {item.assetName} · reported {item.agoText} · source: incident database
                  </Text>
                  {item.incident.lastNote ? <Text style={text.mono}>Latest note: {item.incident.lastNote}</Text> : null}
                </Card>
              );
            case 'escalation':
              return (
                <Card style={{ padding: space.sm }}>
                  <Text style={text.h2}>{item.urgent ? 'Contact staff now' : 'Reach a person'}</Text>
                  <Text style={text.muted}>{item.reason}. These open on your phone — SIGNAL doesn’t call or email for you.</Text>
                  {item.options.map((o) => (
                    <Pressable key={o.href} accessibilityRole="link" accessibilityLabel={`${o.label}${o.detail ? `, ${o.detail}` : ''}`} onPress={() => Linking.openURL(o.href)} style={styles.link}>
                      <Text style={styles.linkText}>
                        {o.kind === 'call' ? '📞' : o.kind === 'email' ? '✉️' : '↗'} {o.label}
                      </Text>
                      {o.detail ? <Text style={text.mono}>{o.detail}</Text> : null}
                    </Pressable>
                  ))}
                </Card>
              );
          }
        }}
      />
      {presets.length > 0 && (
        <View style={styles.presets}>
          <Text style={text.muted}>Common here</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            {presets.map((p) => (
              <Pressable
                key={p.label}
                accessibilityRole="button"
                accessibilityLabel={`${p.label}${p.detail ? `, ${p.detail}` : ''}`}
                disabled={busy}
                onPress={() => send(p.message)}
                style={({ pressed }) => [styles.preset, pressed && { opacity: 0.7 }]}>
                <Text style={styles.presetText} numberOfLines={2}>
                  {p.label}
                </Text>
                {p.detail ? <Text style={text.mono}>{p.source === 'faq' ? 'FAQ' : p.detail}</Text> : <Text style={text.mono}>FAQ</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={styles.composer}>
        <Composer
          value={input}
          onChangeText={setInput}
          onSend={() => send()}
          disabled={busy}
          placeholder="The projector isn’t showing my laptop…"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const STATE_COPY: Record<string, string> = {
  PENDING: 'Preparing the portal update…',
  INITIATED: 'Anchor is updating the maintenance portal (not verified yet)…',
  VERIFIED: 'Verified: the update was read back from the portal.',
  FAILED: 'The portal update failed. Nothing was confirmed.',
  PENDING_REVIEW: 'Couldn’t confirm the update — flagged for staff review.',
};

function ActionCard({ attempt }: { attempt: Attempt }) {
  const tone = attempt.state === 'VERIFIED' ? 'ok' : attempt.state === 'FAILED' ? 'alert' : 'warn';
  const kind: StatusKind =
    attempt.state === 'VERIFIED' ? 'success' : attempt.state === 'FAILED' ? 'failure' : attempt.state === 'PENDING_REVIEW' ? 'attention' : 'pending';
  return (
    <Card style={{ padding: space.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
        <StatusMark kind={kind} />
        <Text style={[text.h2, { flex: 1 }]}>Portal update · {attempt.incidentKey}</Text>
        <Badge label={attempt.state} tone={tone} />
      </View>
      <Text style={text.body}>{STATE_COPY[attempt.state] ?? attempt.state}</Text>
      {attempt.evidence ? <Text style={text.mono}>Evidence: {attempt.evidence}</Text> : null}
      {attempt.error ? <Text style={styles.notice}>{attempt.error}</Text> : null}
      {attempt.liveViewUrl && attempt.state === 'INITIATED' ? (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(attempt.liveViewUrl!)} style={styles.link}>
          <Text style={styles.linkText}>Watch Anchor live ↗</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { gap: space.xs, padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  pipBand: { height: 70, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  notice: { color: colors.alert, fontSize: 13, lineHeight: 18 },
  link: { minHeight: 36, justifyContent: 'center', paddingHorizontal: space.sm },
  linkText: { color: colors.ink, fontWeight: '700', textDecorationLine: 'underline' },
  toggle: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  composer: { padding: space.md },
  presets: { paddingHorizontal: space.md, paddingTop: space.sm, gap: space.xs },
  preset: { maxWidth: 240, minHeight: 44, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, justifyContent: 'center' },
  presetText: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '600' },
});
