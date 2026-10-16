import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInputInstance,
} from 'react-native';

import { Pip, PipAvatar } from '@/components/Pip';
import { Badge, text } from '@/components/ui';
import {
  ActionRow,
  Callout,
  ChatBubble,
  Composer,
  EscalationCard,
  GlassCard,
  Glyph,
  HeaderIconButton,
  IconWell,
  LocationBlock,
  SignalButton,
  SignalHeader,
  SignalText,
  StatusChip,
  SuggestionTile,
  SuggestionTiles,
  palette,
  radius,
  type CalloutTone,
  type GlyphName,
  type StatusKind,
} from '@/design';
import type { ChatEvent, CueName, EscalationOption, FaqPreset, IncidentView, PipState, PublicSpace } from '@/lib/agent/contracts';
import { DEMO_LOCATION } from '@/constants/tokens';
import { visitorHeaders } from '@/lib/visitor-session';

type Approval = Extract<ChatEvent, { type: 'approval' }>;
type Attempt = { key: string; kind?: string; state: string; liveViewUrl?: string | null; evidence?: string | null; error?: string | null; incidentKey: string; targetHost?: string | null };

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

/** Icon for a "Common here" preset. Presentation only: picks a picture from the words, never changes what is sent. */
function presetIcon(p: FaqPreset): GlyphName {
  const s = `${p.label} ${p.message}`.toLowerCase();
  if (/projector|hdmi|no signal|display|screen/.test(s)) return 'projector';
  if (/wi-?fi|internet|network/.test(s)) return 'wifi';
  if (/\b(door|keypad|lock|locked|code)\b/.test(s)) return 'lock';
  if (/laptop|computer|clicker|slides?\b/.test(s)) return 'laptop';
  if (/\b(lights?|lamp|bulb)\b/.test(s)) return 'lightbulb';
  if (/temperature|heating|cooling|\bac\b|air con/.test(s)) return 'thermometer';
  if (/outlet|power|plug|charg/.test(s)) return 'plug';
  if (/contact|call|phone|\bwho\b/.test(s)) return 'phone';
  return 'help';
}

const presetDetail = (p: FaqPreset) => (p.detail ? (p.source === 'faq' ? 'FAQ' : p.detail) : 'FAQ');
const incidentKind = (status: IncidentView['status']): StatusKind => (status === 'RESOLVED' ? 'success' : 'attention');

type Asset = PublicSpace['assets'][number];

/** Icon for an "In this space" tile, from the operator's asset type (printer, other and unknown types get `help`). */
const ASSET_ICON = new Map<string, GlyphName>([
  ['projector', 'projector'],
  ['laptop', 'laptop'],
  ['wifi', 'wifi'],
  ['lock', 'lock'],
  ['display', 'monitor'],
  ['hvac', 'thermometer'],
]);
const assetIcon = (type: string): GlyphName => ASSET_ICON.get(type) ?? 'help';

/** What an equipment tile puts in the composer: the start of a sentence the visitor finishes ("The left projector …"). */
function assetPrompt(name: string) {
  const subject = name.replace(/^the\s+/i, '');
  // Lower-case "Left projector" mid-sentence, but keep acronyms such as "HDMI switch" or "TV".
  return `The ${/^[A-Z][a-z]/.test(subject) ? subject.charAt(0).toLowerCase() + subject.slice(1) : subject} `;
}

export default function Chat() {
  const router = useRouter();
  // Back only when there is somewhere to go. Read after mount so the server render and hydration match.
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    setCanGoBack(router.canGoBack());
  }, [router]);
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
  const composerRef = useRef<TextInputInstance>(null);
  /** Equipment tile the visitor tapped; shown as selected while the composer still starts with its sentence. */
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pip, setPip] = useState<PipState>('idle');
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
        const endpoint =
          a.kind === 'MAINTENANCE_CALL'
            ? '/api/actions/call'
            : a.kind === 'SUBMIT_EXTERNAL_REPORT'
              ? '/api/actions/external-report'
              : a.kind === 'SEND_EMAIL'
                ? '/api/actions/email'
                : '/api/actions/portal-update';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: visitorHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ actionId: a.actionId, locationId: spaceId, incidentKey: a.incidentKey ?? null, assetId: a.assetId ?? null, summary: a.summary ?? lastProblem.current }),
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
          if (['VERIFIED', 'FAILED', 'PENDING_REVIEW', 'AGENT_REPORTED'].includes(json.attempt.state)) {
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

  const assets = room?.assets ?? [];

  // Equipment tiles only start the visitor's sentence; nothing is sent until they tap send.
  // Focus stays inside the tap handler so mobile browsers open the keyboard.
  function pickAsset(asset: Asset) {
    const prompt = assetPrompt(asset.name);
    setInput((prev) => {
      const previous = assets.map((a) => assetPrompt(a.name)).find((p) => prev.startsWith(p));
      return prompt + (previous ? prev.slice(previous.length) : prev.trimStart());
    });
    setPicked(asset.id);
    composerRef.current?.focus();
  }

  function somethingElse() {
    setPicked(null);
    // Drop a tile's sentence start the visitor hasn't added to; keep anything they typed.
    setInput((prev) => (assets.some((a) => prev === assetPrompt(a.name)) ? '' : prev));
    composerRef.current?.focus();
  }

  // Before the first message the equipment and presets are the welcome grids; after it the presets shrink to a chip
  // row above the composer and the equipment grid goes away.
  const started = items.some((i) => i.kind === 'user');
  const back = canGoBack ? () => router.back() : undefined;

  if (locked) {
    return (
      <View style={styles.root}>
        <View style={styles.top}>
          <SignalHeader onBack={back} />
        </View>
        <View style={styles.lockedBody}>
          <GlassCard style={styles.lockedCard}>
            <IconWell name="nfc" tone="accent" size={64} />
            <View>
              <Badge label="NFC tap required" tone="warn" />
            </View>
            <Text style={[text.h2, styles.center]}>Tap the SIGNAL chip in {locked}</Text>
            <Text style={[text.body, styles.center]}>This helper only opens from a tap on the chip in this space. Hold your phone near the tag to start.</Text>
            <Text style={[text.muted, styles.center]}>Already tapped? Your tap session lasts 30 minutes — tap again for a fresh one.</Text>
          </GlassCard>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.top}>
        <SignalHeader
          onBack={back}
          right={
            <HeaderIconButton
              accessibilityRole="switch"
              accessibilityState={{ checked: sound }}
              accessibilityLabel="Pip sound cues"
              onPress={() => setSound((s) => !s)}>
              <Glyph name={sound ? 'volume' : 'volume-off'} size={22} color={sound ? 'accentInk' : 'textSecondary'} />
            </HeaderIconButton>
          }
        />
        <LocationBlock
          room={room?.name ?? (spaceError ? 'Unknown space' : 'Loading…')}
          building={room?.siteName}
          badge={
            <Badge
              label={verified ? 'Secure NFC scan checked' : via === 'operator' ? 'Operator preview (no tap)' : 'DEMO / NFC simulation'}
              tone={verified ? 'ok' : 'warn'}
            />
          }>
          {spaceError ? <Text style={styles.errorText}>Could not load this space: {spaceError}</Text> : null}
        </LocationBlock>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          !started && (assets.length > 0 || presets.length > 0) ? (
            <View style={styles.welcome}>
              {assets.length > 0 ? (
                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <SignalText variant="section">In this space</SignalText>
                    <SignalText variant="meta">
                      {assets.length} {assets.length === 1 ? 'element' : 'elements'}
                    </SignalText>
                  </View>
                  <SuggestionTiles columns={3}>
                    {assets.map((a) => (
                      <SuggestionTile
                        key={a.id}
                        icon={assetIcon(a.type)}
                        label={a.name}
                        selected={picked === a.id && input.startsWith(assetPrompt(a.name))}
                        onPress={() => pickAsset(a)}
                      />
                    ))}
                  </SuggestionTiles>
                  <ActionRow icon="dots" title="Something else" detail="Issue with something not listed" onPress={somethingElse} />
                </View>
              ) : null}
              {presets.length > 0 ? (
                <View style={styles.section}>
                  <View style={styles.sectionHead}>
                    <SignalText variant="section">Common here</SignalText>
                    <SignalText variant="meta">{presets.length} topics</SignalText>
                  </View>
                  <SuggestionTiles columns={2}>
                    {presets.map((p) => (
                      <SuggestionTile
                        key={p.label}
                        align="start"
                        icon={presetIcon(p)}
                        label={p.label}
                        detail={presetDetail(p)}
                        accessibilityLabel={`${p.label}${p.detail ? `, ${p.detail}` : ''}`}
                        disabled={busy}
                        onPress={() => send(p.message)}
                      />
                    ))}
                  </SuggestionTiles>
                </View>
              ) : null}
            </View>
          ) : busy ? (
            <View accessibilityLiveRegion="polite">
              <ChatBubble from="assistant" leading={<PipAvatar size={34} state="thinking" />}>
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color={palette.accent} />
                  <SignalText variant="label" color="textSecondary">
                    Checking…
                  </SignalText>
                </View>
              </ChatBubble>
            </View>
          ) : undefined
        }
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'user':
              return <ChatBubble from="user">{item.text}</ChatBubble>;
            case 'pip':
              return (
                <View style={styles.pipMessage}>
                  <ChatBubble from="assistant" leading={item.id === GREETING_ID ? <Pip state={pip} size={46} /> : <PipAvatar size={34} />}>
                    {item.text}
                  </ChatBubble>
                  {item.solvable && (
                    <View style={styles.underBubble}>
                      <SignalButton
                        variant="outline"
                        size="sm"
                        label="That fixed it"
                        leading={<Glyph name="check" size={16} color="accentInk" />}
                        onPress={() => markSolved(item)}
                      />
                    </View>
                  )}
                </View>
              );
            case 'notice':
              return (
                <View style={styles.notice}>
                  <Glyph name="info" size={16} color="errorInk" />
                  <Text style={styles.noticeText}>{item.text}</Text>
                </View>
              );
            case 'caption':
              return (
                <View style={styles.caption}>
                  <Glyph name="volume" size={14} color="textMuted" />
                  <SignalText variant="meta">{item.text.replace(/^🔊\s*/, '')}</SignalText>
                </View>
              );
            case 'source':
              return (
                <Callout icon="file" title={`From memory · ${item.title}`}>
                  {item.occurredAt ? <SignalText variant="meta">{item.occurredAt}</SignalText> : null}
                  <SignalText variant="body">{item.text}</SignalText>
                </Callout>
              );
            case 'incident':
              return (
                <Callout
                  icon="ticket"
                  title={`Ticket ${item.incident.key}`}
                  aside={<StatusChip kind={incidentKind(item.incident.status)} label={item.incident.status} live={false} />}>
                  <SignalText variant="body">{item.incident.summary}</SignalText>
                  <SignalText variant="meta">
                    {item.relation === 'created' ? 'Created just now' : 'On record'} · updated {item.incident.updatedAt} · source: incident database
                  </SignalText>
                  {item.incident.lastNote ? (
                    <SignalText variant="meta" color="textSecondary" style={styles.note}>
                      Latest note: {item.incident.lastNote}
                    </SignalText>
                  ) : null}
                </Callout>
              );
            case 'approval':
              if (item.status === 'offered' || item.status === 'working') {
                return (
                  <EscalationCard
                    title="Needs your OK"
                    body={
                      item.approval.draft
                        ? `${
                            item.approval.kind === 'SEND_EMAIL'
                              ? 'SIGNAL will email the facilities team this report'
                              : `Anchor will fill the report form on ${item.approval.targetHost} with exactly this`
                          }:\n\n${item.approval.draft}\n\nNothing is sent until you tap.`
                        : 'Nothing is sent until you tap.'
                    }
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
                <View style={styles.approvalDone}>
                  <Glyph name={item.status === 'done' ? 'check' : 'x'} size={16} color="textSecondary" />
                  <SignalText variant="label" color="textSecondary">
                    {item.status === 'done' ? 'Approved' : 'Declined — nothing was sent.'}
                  </SignalText>
                </View>
              );
            case 'action':
              return <ActionCard attempt={item.attempt} />;
            case 'seen': {
              const resolved = item.incident.status === 'RESOLVED';
              return (
                <Callout
                  tone={resolved ? 'success' : 'attention'}
                  icon={resolved ? 'check' : 'history'}
                  title={`Seen before · ${item.incident.key}`}
                  aside={<StatusChip kind={incidentKind(item.incident.status)} label={item.incident.status} live={false} />}>
                  <SignalText variant="body">{item.incident.summary}</SignalText>
                  <SignalText variant="meta" color="textSecondary">
                    {item.assetName} · reported {item.agoText} · source: incident database
                  </SignalText>
                  {item.incident.lastNote ? (
                    <SignalText variant="meta" color="textSecondary" style={styles.note}>
                      Latest note: {item.incident.lastNote}
                    </SignalText>
                  ) : null}
                </Callout>
              );
            }
            case 'escalation':
              return (
                <Callout
                  tone={item.urgent ? 'attention' : 'neutral'}
                  icon={item.urgent ? 'alert-triangle' : 'person'}
                  title={item.urgent ? 'Contact staff now' : 'Reach a person'}
                  inset={false}>
                  <SignalText variant="label" color="textSecondary" style={styles.regular}>
                    {item.reason}. These open on your phone — SIGNAL doesn’t call or email for you.
                  </SignalText>
                  {item.options.map((o) => (
                    <ActionRow
                      key={o.href}
                      accessibilityRole="link"
                      accessibilityLabel={`${o.label}${o.detail ? `, ${o.detail}` : ''}`}
                      icon={o.kind === 'call' ? 'phone' : o.kind === 'email' ? 'mail' : 'external'}
                      iconTone={o.kind === 'call' && item.urgent ? 'accent' : 'neutral'}
                      title={o.label}
                      detail={o.detail}
                      onPress={() => Linking.openURL(o.href)}
                    />
                  ))}
                </Callout>
              );
          }
        }}
      />
      <View style={styles.bottom}>
        {started && presets.length > 0 ? (
          <View style={styles.presets}>
            <SignalText variant="meta" style={styles.presetsLabel}>
              Common here
            </SignalText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.label}${p.detail ? `, ${p.detail}` : ''}`}
                  disabled={busy}
                  onPress={() => send(p.message)}
                  style={({ pressed }) => [styles.preset, pressed && styles.presetPressed, busy && styles.presetBusy]}>
                  <Glyph name={presetIcon(p)} size={18} />
                  <View style={styles.presetText}>
                    <Text style={styles.presetLabel} numberOfLines={2}>
                      {p.label}
                    </Text>
                    <Text style={styles.presetDetail} numberOfLines={1}>
                      {presetDetail(p)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <Composer
          inputRef={composerRef}
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

const CALL_STATE_COPY: Record<string, string> = {
  PENDING: 'Placing the call…',
  INITIATED: 'Call started — waiting for the outcome. Nobody has been notified yet.',
  VERIFIED: 'The automated call was answered and played your report. Staff haven’t acknowledged the ticket yet.',
  FAILED: 'The call did not go through. Staff were not notified.',
  PENDING_REVIEW: 'Couldn’t confirm the call — flagged for review.',
};

// Company's own portal: we can't read it back, so the best outcome is "Anchor says submitted" — never green/verified.
const EXTERNAL_STATE_COPY: Record<string, string> = {
  PENDING: 'Preparing the report…',
  INITIATED: 'Anchor is filling the company’s report form (not confirmed yet)…',
  AGENT_REPORTED: 'Anchor says the report was submitted. SIGNAL can’t check the company’s site, so this isn’t independently verified.',
  FAILED: 'The report could not be submitted. Nothing was sent.',
  PENDING_REVIEW: 'Anchor couldn’t submit the form — flagged for staff review.',
};

const EMAIL_STATE_COPY: Record<string, string> = {
  PENDING: 'Sending the email…',
  AGENT_REPORTED: 'SIGNAL emailed your report to the facilities team. The email was accepted for delivery; nobody has confirmed reading it yet.',
  FAILED: 'The email could not be sent. Nobody was notified.',
};

function ActionCard({ attempt }: { attempt: Attempt }) {
  const isCall = attempt.kind === 'MAINTENANCE_CALL';
  const isExternal = attempt.kind === 'EXTERNAL_REPORT';
  const isEmail = attempt.kind === 'EMAIL_REPORT';
  const kind: StatusKind =
    attempt.state === 'VERIFIED'
      ? 'success'
      : attempt.state === 'FAILED'
        ? 'failure'
        : attempt.state === 'PENDING_REVIEW' || attempt.state === 'AGENT_REPORTED'
          ? 'attention'
          : 'pending';
  // Green only for VERIFIED (read back / answered); in-flight states stay neutral.
  const tone: CalloutTone = kind === 'pending' ? 'neutral' : kind;
  const icon: GlyphName = kind === 'success' ? 'check' : kind === 'failure' ? 'x' : kind === 'attention' ? 'alert' : isCall ? 'phone' : 'clock';
  return (
    <Callout
      tone={tone}
      icon={icon}
      title={`${isCall ? 'Maintenance call' : isEmail ? 'Email to facilities' : isExternal ? `Report on ${attempt.targetHost ?? 'company portal'}` : 'Portal update'} · ${attempt.incidentKey}`}
      aside={<StatusChip kind={kind} label={attempt.state === 'AGENT_REPORTED' ? (isEmail ? 'SENT (NOT CONFIRMED)' : 'SUBMITTED (UNVERIFIED)') : attempt.state} live={false} />}>
      <SignalText variant="body">{(isCall ? CALL_STATE_COPY : isEmail ? EMAIL_STATE_COPY : isExternal ? EXTERNAL_STATE_COPY : STATE_COPY)[attempt.state] ?? attempt.state}</SignalText>
      {attempt.evidence ? (
        <SignalText variant="meta" color="textSecondary" style={styles.note}>
          Evidence: {attempt.evidence}
        </SignalText>
      ) : null}
      {attempt.error ? <Text style={styles.errorText}>{attempt.error}</Text> : null}
      {attempt.liveViewUrl && attempt.state === 'INITIATED' ? (
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(attempt.liveViewUrl!)} style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
          <Text style={styles.linkText}>Watch Anchor live</Text>
          <Glyph name="external" size={16} color="accentInk" />
        </Pressable>
      ) : null}
    </Callout>
  );
}

const chipShadow = '0 2px 8px rgba(80,58,38,0.08)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas, width: '100%', maxWidth: 480, alignSelf: 'center' },
  top: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, gap: 8 },
  list: { flex: 1 },
  listContent: { gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16 },
  welcome: { gap: 24, marginTop: 6 },
  section: { gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2 },
  pipMessage: { gap: 8 },
  underBubble: { paddingLeft: 44 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.well,
    backgroundColor: palette.errorSoft,
  },
  noticeText: { flex: 1, color: palette.errorInk, fontSize: 13, lineHeight: 18 },
  errorText: { color: palette.errorInk, fontSize: 13, lineHeight: 18 },
  caption: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, paddingVertical: 2 },
  note: { borderLeftWidth: 2, borderLeftColor: palette.accentLine, paddingLeft: 8 },
  approvalDone: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.surfaceSunken,
  },
  regular: { fontWeight: '400' },
  link: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, minHeight: 36, paddingHorizontal: 2 },
  linkPressed: { opacity: 0.6 },
  linkText: { color: palette.accentInk, fontWeight: '600', fontSize: 14 },
  bottom: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14, gap: 8 },
  presets: { gap: 4 },
  presetsLabel: { paddingHorizontal: 4 },
  presetRow: { gap: 8, paddingHorizontal: 2, paddingVertical: 6 },
  preset: {
    maxWidth: 240,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceGlassStrong,
    boxShadow: chipShadow,
  },
  presetPressed: { backgroundColor: palette.accentSoft, borderColor: palette.accentLine },
  presetBusy: { opacity: 0.5 },
  presetText: { flexShrink: 1, gap: 1 },
  presetLabel: { color: palette.text, fontSize: 13, lineHeight: 17, fontWeight: '600' },
  presetDetail: { color: palette.textMuted, fontSize: 11, lineHeight: 14 },
  lockedBody: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 48 },
  lockedCard: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  center: { textAlign: 'center' },
});
