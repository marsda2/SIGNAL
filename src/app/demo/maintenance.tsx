import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Badge, Button, text } from '@/components/ui';
import { colors, radius } from '@/constants/tokens';

type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
type Ticket = {
  key: string; locationId: string; locationName?: string; assetId: string | null; assetName?: string;
  status: Status; summary: string; reportedAt: string; updatedAt: string; resolution?: string | null; source: string;
  notes: { at: string; by: string; text: string }[];
};
const STATUSES: Status[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
const LABEL: Record<Status, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', RESOLVED: 'Resolved' };
const SOURCE: Record<string, string> = { fixture: 'Demo fixture', visitor: 'Visitor report', portal: 'Portal update' };
const ACTOR: Record<string, string> = { portal_user: 'Maintenance portal', operator_demo: 'Demo operator', anchor_agent: 'SIGNAL browser agent' };
function timestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Owned demo portal. Preserve Anchor's Ticket <key>, raw status accessibility labels, note labels and Save update. */
export default function MaintenancePortal() {
  const { ticket: focus } = useLocalSearchParams<{ ticket?: string }>();
  const wide = useWindowDimensions().width >= 900;
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [backend, setBackend] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
  const refreshing = useRef(false);
  const load = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setLoading(true);
    try {
      const res = await fetch('/api/portal/tickets', { signal: AbortSignal.timeout(15000) });
      const json = await res.json() as { tickets?: Ticket[]; backend?: string; error?: string };
      if (!res.ok || !json.tickets) throw new Error(json.error ?? `HTTP ${res.status}`);
      setTickets(json.tickets);
      setBackend(json.backend ?? '');
      setLoadedAt(new Date().toISOString());
      setError(null);
    } catch {
      setError('Tickets could not be refreshed. Please try again. Previously loaded tickets may be out of date.');
    } finally {
      refreshing.current = false;
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const counts = Object.fromEntries(STATUSES.map((s) => [s, tickets?.filter((t) => t.status === s).length ?? 0])) as Record<Status, number>;
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (tickets ?? []).filter((t) => (filter === 'ALL' || t.status === filter) &&
      (!query || [t.key, t.summary, t.locationName, t.locationId, t.assetName, t.assetId].join(' ').toLowerCase().includes(query)))
      .sort((a, b) => Number(b.key === focus) - Number(a.key === focus) || STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [tickets, filter, search, focus]);

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.topbar}>
      <View style={styles.row}><View style={styles.logo}><Text style={styles.logoText}>S</Text></View><View><Text style={styles.brand}>SIGNAL</Text><Text style={styles.eyebrow}>FACILITIES OPERATIONS</Text></View></View>
      <Badge label="Demo workspace" tone="warn" />
    </View>
    <View style={styles.hero}>
      <View style={styles.headingCopy}><Text accessibilityRole="header" style={styles.title}>Maintenance desk</Text><Text style={styles.subtitle}>Every report. Every update. One place to keep spaces working.</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh tickets" disabled={loading} onPress={load} style={styles.secondaryButton}>
        {loading ? <ActivityIndicator size="small" color={colors.sea} /> : null}<Text style={styles.secondaryLabel}>{loading ? 'Refreshing…' : 'Refresh tickets'}</Text>
      </Pressable>
    </View>
    <View style={styles.metrics}>
      {STATUSES.map((s) => <Pressable key={s} accessibilityRole="button" accessibilityLabel={`Show ${LABEL[s].toLowerCase()} tickets`} onPress={() => setFilter(s)} style={[styles.metric, filter === s && styles.metricSelected]}>
        <Text style={styles.metricLabel}>{LABEL[s]}</Text><Text style={[styles.metricNumber, s === 'RESOLVED' && { color: colors.successInk }]}>{tickets ? counts[s] : '—'}</Text>
        <Text style={text.muted}>{s === 'OPEN' ? 'Awaiting attention' : s === 'IN_PROGRESS' ? 'Work underway' : 'Marked resolved'}</Text>
      </Pressable>)}
    </View>
    <View style={styles.toolbar}>
      <TextInput value={search} onChangeText={setSearch} accessibilityLabel="Search maintenance tickets" placeholder="Search ticket, room, or equipment…" placeholderTextColor={colors.muted} style={styles.search} />
      <View style={styles.filterRow}>{(['ALL', ...STATUSES] as const).map((s) => <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected: filter === s }} onPress={() => setFilter(s)} style={[styles.filter, filter === s && styles.filterSelected]}>
        <Text style={[styles.filterLabel, filter === s && styles.filterLabelSelected]}>{s === 'ALL' ? 'All tickets' : LABEL[s]} · {s === 'ALL' ? tickets?.length ?? 0 : counts[s]}</Text>
      </Pressable>)}</View>
    </View>
    <View style={styles.listHeader}><Text style={styles.sectionTitle}>{filter === 'ALL' ? 'All tickets' : `${LABEL[filter]} tickets`}{tickets ? ` (${visible.length})` : ''}</Text><Text style={text.muted}>{loadedAt ? `Refreshed ${timestamp(loadedAt)}` : 'Connecting to the portal…'}</Text></View>
    {error ? <View accessibilityRole="alert" style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
    {!tickets && loading ? <View style={styles.empty}><ActivityIndicator color={colors.sea} /><Text style={text.muted}>Loading maintenance reports…</Text></View> : null}
    {tickets && !visible.length ? <View style={styles.empty}><Text style={text.h2}>No tickets match this view</Text><Text style={text.muted}>Try another room, equipment name, or status.</Text><Pressable accessibilityRole="button" onPress={() => { setSearch(''); setFilter('ALL'); }} style={styles.secondaryButton}><Text style={styles.secondaryLabel}>Clear filters</Text></Pressable></View> : null}
    {visible.map((ticket) => <TicketCard key={ticket.key} ticket={ticket} focused={ticket.key === focus} wide={wide} onSaved={load} />)}
    <View style={styles.footer}><Text style={text.muted}>SIGNAL demo portal · Sample tickets are labelled individually.</Text>{backend ? <Badge label={backend === 'surrealdb' ? 'Connected database' : 'Local demo · temporary storage'} tone={backend === 'surrealdb' ? 'neutral' : 'warn'} /> : null}</View>
  </ScrollView>;
}

function TicketCard({ ticket, focused, wide, onSaved }: { ticket: Ticket; focused: boolean; wide: boolean; onSaved: () => Promise<void> }) {
  const [status, setStatus] = useState<Status>(ticket.status);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const previousStatus = useRef(ticket.status);
  useEffect(() => {
    const previous = previousStatus.current;
    setStatus((current) => current === previous ? ticket.status : current);
    previousStatus.current = ticket.status;
  }, [ticket.status]);
  const dirty = status !== ticket.status || Boolean(note.trim());
  const notes = [...ticket.notes].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  async function save() {
    if (state === 'saving' || !dirty) return;
    setState('saving'); setErr('');
    try {
      const res = await fetch(`/api/portal/tickets/${encodeURIComponent(ticket.key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, note: note.trim() }),
      });
      const json = await res.json() as { ticket?: Ticket };
      if (!res.ok || json.ticket?.key !== ticket.key || json.ticket.status !== status) throw new Error('The portal did not confirm this update. Refresh the ticket before retrying.');
      setState('saved'); setNote(''); await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'The update could not be saved. Your draft is still here.'); setState('error');
    }
  }
  return <View nativeID={`ticket-${ticket.key}`} style={[styles.ticket, focused && styles.ticketFocused]}>
    <View style={styles.ticketHeader}><View style={styles.row}><Text accessibilityRole="header" style={styles.ticketTitle}>Ticket {ticket.key}</Text>{focused ? <Badge label="Selected report" tone="warn" /> : null}</View><Badge label={LABEL[ticket.status]} tone={ticket.status === 'RESOLVED' ? 'ok' : 'warn'} /></View>
    <View style={[styles.ticketBody, wide && styles.ticketBodyWide]}>
      <View style={styles.details}>
        <Text style={styles.location}>{ticket.locationName ?? ticket.locationId} / {ticket.assetName ?? ticket.assetId ?? 'Equipment not specified'}</Text>
        <Text style={styles.summary}>{ticket.summary}</Text>
        <View style={styles.metaRow}><Badge label={SOURCE[ticket.source] ?? 'Report'} /><Text style={text.muted}>Reported {timestamp(ticket.reportedAt)}</Text></View>
        {ticket.resolution ? <View style={styles.resolution}><Text style={styles.smallHeading}>Recorded resolution</Text><Text style={text.body}>{ticket.resolution}</Text></View> : null}
        <View style={styles.activityHeading}><Text style={styles.smallHeading}>Activity</Text><Text style={text.muted}>{notes.length} {notes.length === 1 ? 'update' : 'updates'}</Text></View>
        {notes.length ? (showHistory ? notes : notes.slice(0, 3)).map((n, i) => <View key={`${n.at}-${i}`} style={styles.activity}><View style={styles.activityDot} /><View style={styles.activityCopy}><Text style={styles.activityMeta}>{ACTOR[n.by] ?? n.by} · {timestamp(n.at)}</Text><Text style={text.body}>{n.text}</Text></View></View>) : <Text style={text.muted}>No work notes yet. Add the first update to start the record.</Text>}
        {notes.length > 3 ? <Pressable accessibilityRole="button" onPress={() => setShowHistory(!showHistory)}><Text style={styles.link}>{showHistory ? 'Show recent updates' : `Show all ${notes.length} updates`}</Text></Pressable> : null}
        <Text style={styles.updated}>Last updated {timestamp(ticket.updatedAt)}</Text>
      </View>
      <View style={[styles.editor, wide && styles.editorWide]}>
        <Text style={styles.smallHeading}>Update this ticket</Text><Text style={text.muted}>Record what changed so the next person has the full picture.</Text>
        <Text style={styles.fieldLabel}>Status</Text>
        <View style={styles.statusRow} accessibilityRole="radiogroup" accessibilityLabel={`Status for ticket ${ticket.key}`}>
          {STATUSES.map((s) => <Pressable key={s} accessibilityRole="radio" accessibilityState={{ checked: status === s, disabled: state === 'saving' }} accessibilityLabel={s} disabled={state === 'saving'} onPress={() => { setStatus(s); setState('idle'); }} style={[styles.statusOption, status === s && styles.statusSelected]}><Text style={[styles.statusLabel, status === s && styles.statusLabelSelected]}>{LABEL[s]}</Text></Pressable>)}
        </View>
        <Text style={styles.fieldLabel}>Work note</Text>
        <TextInput value={note} onChangeText={(value) => { setNote(value); setState('idle'); }} placeholder="What was checked, changed, or confirmed?" accessibilityLabel={`Note for ticket ${ticket.key}`} placeholderTextColor={colors.muted} style={styles.input} multiline maxLength={500} editable={state !== 'saving'} />
        <Text style={styles.counter}>{note.length}/500</Text>
        <Button testID={`save-${ticket.key}`} label="Save update" onPress={save} disabled={state === 'saving' || !dirty} />
        <View accessibilityLiveRegion="polite">
          {state === 'saving' ? <Text style={text.muted}>Saving update…</Text> : null}
          {state === 'saved' ? <Text style={styles.saved}>Saved · the database confirmed this update.</Text> : null}
          {state === 'error' ? <Text accessibilityRole="alert" style={styles.errorText}>{err}</Text> : null}
          {state === 'idle' && dirty ? <Text style={text.muted}>Unsaved changes</Text> : null}
        </View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: { width: '100%', maxWidth: 1160, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 48 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.signal, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: '#fff', fontWeight: '800', fontSize: 25 },
  brand: { color: colors.ink, fontSize: 18, fontWeight: '800', letterSpacing: 3 },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 3 },
  hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 18, paddingVertical: 12 },
  headingCopy: { flexGrow: 1, flexBasis: 300, gap: 8 },
  title: { color: colors.ink, fontSize: 36, lineHeight: 43, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { ...text.body, color: colors.muted },
  secondaryButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  secondaryLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { flex: 1, flexBasis: 170, backgroundColor: colors.surface, padding: 20, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, gap: 6 },
  metricSelected: { borderColor: colors.sea, backgroundColor: colors.warning },
  metricLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  metricNumber: { color: colors.ink, fontSize: 34, lineHeight: 40, fontWeight: '700' },
  toolbar: { gap: 14, paddingTop: 4 },
  search: { minHeight: 50, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 16, color: colors.ink, fontSize: 15 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: colors.line },
  filterSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  filterLabel: { color: colors.muted, fontWeight: '600', fontSize: 13 },
  filterLabelSelected: { color: '#fff' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  sectionTitle: { color: colors.ink, fontWeight: '700', fontSize: 18 },
  ticket: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  ticketFocused: { borderColor: colors.sea, borderWidth: 2 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 20, borderBottomWidth: 1, borderColor: colors.line },
  ticketTitle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  ticketBody: { flexDirection: 'column' }, ticketBodyWide: { flexDirection: 'row' },
  details: { flex: 1, padding: 22, gap: 14 },
  location: { color: colors.sea, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  summary: { color: colors.ink, fontSize: 22, lineHeight: 29, fontWeight: '600', letterSpacing: -0.4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  resolution: { backgroundColor: colors.successSoft, padding: 14, borderRadius: radius.sm, gap: 6 },
  smallHeading: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  activityHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  activity: { flexDirection: 'row', gap: 12 },
  activityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.sea, marginTop: 7 },
  activityCopy: { flex: 1, gap: 4 }, activityMeta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  updated: { color: colors.muted, fontSize: 12, marginTop: 4 },
  editor: { backgroundColor: '#FAF8F5', padding: 22, gap: 10, borderTopWidth: 1, borderColor: colors.line },
  editorWide: { width: 350, borderTopWidth: 0, borderLeftWidth: 1 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '600', marginTop: 6 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statusOption: { minHeight: 44, paddingHorizontal: 11, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  statusSelected: { borderColor: colors.sea, backgroundColor: colors.warning },
  statusLabel: { fontSize: 12, fontWeight: '500', color: colors.muted }, statusLabelSelected: { color: colors.sea, fontWeight: '700' },
  input: { minHeight: 100, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, padding: 12, color: colors.ink, backgroundColor: colors.surface, fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  counter: { color: colors.muted, fontSize: 12, alignSelf: 'flex-end' },
  saved: { color: colors.successInk, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  errorText: { color: colors.alert, fontSize: 14, lineHeight: 21 },
  errorBox: { padding: 16, backgroundColor: colors.surface, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.alert },
  empty: { padding: 32, backgroundColor: colors.surface, borderRadius: radius.md, alignItems: 'center', gap: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingVertical: 12 },
  link: { color: colors.sea, fontSize: 14, fontWeight: '600', minHeight: 44, lineHeight: 44 },
});
