import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Badge, Button, Card, text } from '@/components/ui';
import { colors, radius, space } from '@/constants/tokens';

type Asset = { id: string; type: string; name: string; model?: string; safeTroubleshooting: string[] };
type Faq = { q: string; a: string };
type Escalation = {
  urgentPhone: string | null;
  urgentLabel?: string | null;
  email: string | null;
  portal: 'signal_demo' | 'external' | 'none';
  portalUrl: string | null;
  portalAutomation?: boolean;
  portalInstructions?: string | null;
  hours?: string | null;
};
type Space = { id: string; name: string; siteName: string; description: string; timezone: string; assets: Asset[]; faqs: Faq[]; escalation: Escalation; nfcTags: string[]; access?: 'nfc' | 'open'; updatedAt?: string };

const ASSET_TYPES = ['projector', 'laptop', 'wifi', 'lock', 'display', 'printer', 'hvac', 'other'];
const SECRET_KEY = 'signal.operatorSecret';

const blank = (): Space => ({
  id: '',
  name: '',
  siteName: '',
  description: '',
  timezone: 'America/New_York',
  assets: [],
  faqs: [],
  escalation: { urgentPhone: null, urgentLabel: null, email: null, portal: 'signal_demo', portalUrl: null, hours: null },
  nfcTags: [],
  access: 'nfc',
});

function readSecret() {
  try {
    return globalThis.sessionStorage?.getItem(SECRET_KEY) ?? '';
  } catch {
    return '';
  }
}
function writeSecret(v: string) {
  try {
    globalThis.sessionStorage?.setItem(SECRET_KEY, v);
  } catch {
    /* per-tab convenience only */
  }
}

/** Operator portal: describe a space, its equipment and FAQs, who to escalate to, and which NFC chips open it. */
export default function SpacesAdmin() {
  const [secret, setSecret] = useState(readSecret);
  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [draft, setDraft] = useState<Space | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'warn' | 'alert'; text: string } | null>(null);

  const headers = useCallback(() => ({ 'Content-Type': 'application/json', 'x-demo-secret': secret }), [secret]);

  const load = useCallback(async () => {
    if (!secret) return;
    try {
      const res = await fetch('/api/spaces', { headers: headers() });
      if (res.status === 403) throw new Error('Wrong operator secret');
      const json = (await res.json()) as { spaces?: Space[]; error?: string };
      if (!json.spaces) throw new Error(json.error ?? `HTTP ${res.status}`);
      setSpaces(json.spaces);
      setStatus(null);
    } catch (e) {
      setSpaces(null);
      setStatus({ tone: 'alert', text: e instanceof Error ? e.message : String(e) });
    }
  }, [secret, headers]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!draft) return;
    setStatus({ tone: 'warn', text: 'Saving…' });
    try {
      const res = await fetch(`/api/spaces/${encodeURIComponent(draft.id)}`, { method: 'PUT', headers: headers(), body: JSON.stringify(draft) });
      const json = (await res.json()) as { space?: Space; memory?: string; error?: string; issues?: string[] };
      if (!res.ok || !json.space) throw new Error(json.issues?.join('\n') ?? json.error ?? `HTTP ${res.status}`);
      setDraft(json.space);
      setIsNew(false);
      setStatus({ tone: 'ok', text: `Saved to the space database · Agent Memory: ${json.memory}` });
      load();
    } catch (e) {
      setStatus({ tone: 'alert', text: e instanceof Error ? e.message : String(e) });
    }
  }

  async function operatorPost(path: string, label: string) {
    setStatus({ tone: 'warn', text: `${label}…` });
    try {
      const res = await fetch(path, { method: 'POST', headers: headers() });
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      setStatus({ tone: 'ok', text: `${label}: ${JSON.stringify(json).slice(0, 200)}` });
    } catch (e) {
      setStatus({ tone: 'alert', text: `${label} failed: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  const set = <K extends keyof Space>(k: K, v: Space[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const setEsc = <K extends keyof Escalation>(k: K, v: Escalation[K]) => setDraft((d) => (d ? { ...d, escalation: { ...d.escalation, [k]: v } } : d));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={text.h1}>Spaces</Text>
      <Text style={text.muted}>What Pip knows about each place, who it escalates to, and which NFC chips open it. Saved to the space database; each save also records a new profile in Agent Memory.</Text>

      <Card>
        <Field label="Operator secret" value={secret} secureTextEntry onChangeText={(v) => { setSecret(v); writeSecret(v); }} placeholder="DEMO_OPERATOR_LOGIN_SECRET" />
        <View style={styles.row}>
          <Button label="Load spaces" onPress={load} />
          <Button label="Reset demo reports" onPress={() => operatorPost('/api/demo/reset', 'Reset demo reports')} />
          <Button label="Seed Agent Memory" onPress={() => operatorPost('/api/memory/seed', 'Seed Agent Memory')} />
        </View>
      </Card>

      {status && (
        <Text style={[text.body, { color: status.tone === 'alert' ? colors.alert : colors.ink }]} accessibilityLiveRegion="polite">
          {status.text}
        </Text>
      )}

      {spaces && (
        <View style={styles.row}>
          {spaces.map((s) => (
            <Pressable key={s.id} accessibilityRole="button" onPress={() => { setDraft(s); setIsNew(false); }} style={[styles.chip, draft?.id === s.id && styles.chipOn]}>
              <Text style={styles.chipText}>{s.name}</Text>
              <Text style={text.mono}>{s.id} · {s.nfcTags.length} chip{s.nfcTags.length === 1 ? '' : 's'}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => { setDraft(blank()); setIsNew(true); }} style={styles.chip}>
            <Text style={styles.chipText}>+ New space</Text>
          </Pressable>
        </View>
      )}

      {draft && (
        <>
          <Card>
            <Text style={text.h2}>About the space</Text>
            <Field label="Space id (used in links, can't change later)" value={draft.id} editable={isNew} onChangeText={(v) => set('id', v.toLowerCase().replace(/[^a-z0-9_-]/g, '_'))} placeholder="pitch_area" />
            <Field label="Name visitors see" value={draft.name} onChangeText={(v) => set('name', v)} placeholder="Pitch Area" />
            <Field label="Site / building" value={draft.siteName} onChangeText={(v) => set('siteName', v)} />
            <Field label="Context for Pip" value={draft.description} onChangeText={(v) => set('description', v)} multiline placeholder="What's in the room, how things are set up, anything a visitor should know." />
            {!isNew && (
              <Link href={{ pathname: '/s/[session]', params: { session: draft.id } }} style={styles.linkText}>
                Open the visitor chat for this space ↗
              </Link>
            )}
          </Card>

          <Card>
            <Text style={text.h2}>Equipment</Text>
            {draft.assets.map((a, i) => (
              <View key={i} style={styles.block}>
                <View style={styles.row}>
                  {ASSET_TYPES.map((t) => (
                    <Pressable key={t} accessibilityRole="radio" accessibilityState={{ selected: a.type === t }} onPress={() => set('assets', draft.assets.map((x, j) => (j === i ? { ...x, type: t } : x)))} style={[styles.pill, a.type === t && styles.chipOn]}>
                      <Text>{t}</Text>
                    </Pressable>
                  ))}
                </View>
                <Field label="Name" value={a.name} onChangeText={(v) => set('assets', draft.assets.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder="Left projector" />
                <Field label="Asset id" value={a.id} onChangeText={(v) => set('assets', draft.assets.map((x, j) => (j === i ? { ...x, id: v.toLowerCase().replace(/[^a-z0-9_-]/g, '_') } : x)))} />
                <Field label="Model (optional)" value={a.model ?? ''} onChangeText={(v) => set('assets', draft.assets.map((x, j) => (j === i ? { ...x, model: v } : x)))} />
                <Field
                  label="Safe self-help steps (one per line)"
                  value={a.safeTroubleshooting.join('\n')}
                  multiline
                  onChangeText={(v) => set('assets', draft.assets.map((x, j) => (j === i ? { ...x, safeTroubleshooting: v.split('\n') } : x)))}
                />
                <Pressable accessibilityRole="button" onPress={() => set('assets', draft.assets.filter((_, j) => j !== i))}>
                  <Text style={styles.remove}>Remove {a.name || 'item'}</Text>
                </Pressable>
              </View>
            ))}
            <Button label="+ Add equipment" onPress={() => set('assets', [...draft.assets, { id: `asset_${draft.assets.length + 1}`, type: 'other', name: '', safeTroubleshooting: [] }])} />
          </Card>

          <Card>
            <Text style={text.h2}>FAQ presets</Text>
            <Text style={text.muted}>Shown as tap-to-ask buttons in the chat, next to the most frequent issues from memory.</Text>
            {draft.faqs.map((f, i) => (
              <View key={i} style={styles.block}>
                <Field label="Question" value={f.q} onChangeText={(v) => set('faqs', draft.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)))} />
                <Field label="Answer" value={f.a} multiline onChangeText={(v) => set('faqs', draft.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)))} />
                <Pressable accessibilityRole="button" onPress={() => set('faqs', draft.faqs.filter((_, j) => j !== i))}>
                  <Text style={styles.remove}>Remove question</Text>
                </Pressable>
              </View>
            ))}
            <Button label="+ Add question" onPress={() => set('faqs', [...draft.faqs, { q: '', a: '' }])} />
          </Card>

          <Card>
            <Text style={text.h2}>Escalation</Text>
            <Text style={text.muted}>Visitors get tap-to-call / email buttons. Pip never dials or emails by itself.</Text>
            <Field label="Urgent phone" value={draft.escalation.urgentPhone ?? ''} keyboardType="phone-pad" onChangeText={(v) => setEsc('urgentPhone', v || null)} placeholder="+1 555 0100" />
            <Field label="Label for that line" value={draft.escalation.urgentLabel ?? ''} onChangeText={(v) => setEsc('urgentLabel', v || null)} placeholder="Facilities urgent line" />
            <Field label="Facilities email" value={draft.escalation.email ?? ''} keyboardType="email-address" autoCapitalize="none" onChangeText={(v) => setEsc('email', v || null)} />
            <Field label="Hours" value={draft.escalation.hours ?? ''} onChangeText={(v) => setEsc('hours', v || null)} placeholder="Mon–Fri 8:00–18:00" />
            <Text style={text.muted}>Maintenance portal</Text>
            <View style={styles.row}>
              {(
                [
                  ['signal_demo', 'SIGNAL portal (Anchor files the report)'],
                  ['external', 'The company’s own portal'],
                  ['none', 'None'],
                ] as const
              ).map(([v, label]) => (
                <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: draft.escalation.portal === v }} onPress={() => setEsc('portal', v)} style={[styles.pill, draft.escalation.portal === v && styles.chipOn]}>
                  <Text>{label}</Text>
                </Pressable>
              ))}
            </View>
            {draft.escalation.portal === 'external' && (
              <>
                <Field label="Report page URL (https)" value={draft.escalation.portalUrl ?? ''} autoCapitalize="none" onChangeText={(v) => setEsc('portalUrl', v || null)} placeholder="https://facilities.example.com/new-request" />
                <View style={styles.row}>
                  {(
                    [
                      [true, 'Anchor fills the form for the visitor'],
                      [false, 'Just show the link'],
                    ] as const
                  ).map(([v, label]) => (
                    <Pressable
                      key={String(v)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: Boolean(draft.escalation.portalAutomation) === v }}
                      onPress={() => setEsc('portalAutomation', v)}
                      style={[styles.pill, Boolean(draft.escalation.portalAutomation) === v && styles.chipOn]}>
                      <Text>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                {draft.escalation.portalAutomation && (
                  <>
                    <Field
                      label="How to file a report there (for Anchor)"
                      value={draft.escalation.portalInstructions ?? ''}
                      multiline
                      onChangeText={(v) => setEsc('portalInstructions', v || null)}
                      placeholder={'Click "New request" → choose "Facilities" → put the details in "Description" → Submit.'}
                    />
                    <Text style={text.mono}>
                      The visitor sees the exact report text and approves it first. Anchor only works on this site, never logs in or enters passwords (forms that need a login are flagged for review). The company’s site can’t be read back, so results show as “submitted (unverified)”.
                    </Text>
                  </>
                )}
              </>
            )}
            {draft.escalation.portal === 'signal_demo' && <Text style={text.mono}>Anchor updates SIGNAL’s own /demo/maintenance portal and SIGNAL reads the ticket back to verify.</Text>}
          </Card>

          <Card>
            <Text style={text.h2}>NFC chips</Text>
            <Text style={text.muted}>
              One chip UID per line (14 hex, from `npm run nfc:check`). A verified tap on any of these opens this space. NFC_TAGS in the server env still takes priority.
            </Text>
            <Text style={text.muted}>Who can open this space’s helper</Text>
            <View style={styles.row}>
              {(
                [
                  ['nfc', 'Only from a verified chip tap'],
                  ['open', 'Anyone with the link'],
                ] as const
              ).map(([v, label]) => (
                <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: (draft.access ?? 'open') === v }} onPress={() => set('access', v)} style={[styles.pill, (draft.access ?? 'open') === v && styles.chipOn]}>
                  <Text>{label}</Text>
                </Pressable>
              ))}
            </View>
            {draft.access === 'nfc' && <Text style={text.mono}>Operators with the secret in this tab can still preview the chat (“Operator preview”).</Text>}
            <Field label="Chip UIDs" value={draft.nfcTags.join('\n')} multiline autoCapitalize="characters" onChangeText={(v) => set('nfcTags', v.split('\n').map((s) => s.trim()).filter(Boolean))} placeholder="04DE5F1EACC040" />
            <View style={styles.row}>
              {draft.nfcTags.map((t) => (
                <Badge key={t} label={t} tone={/^[0-9A-F]{14}$/i.test(t) ? 'ok' : 'alert'} />
              ))}
            </View>
          </Card>

          <Button label={isNew ? 'Create space' : 'Save changes'} onPress={save} />
          {draft.updatedAt ? <Text style={text.mono}>last saved {draft.updatedAt}</Text> : null}
        </>
      )}
    </ScrollView>
  );
}

function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={text.muted}>{label}</Text>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, props.editable === false && { opacity: 0.6 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.md, gap: space.md, maxWidth: 760, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' },
  block: { gap: space.sm, paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: colors.line },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm, color: colors.ink, backgroundColor: colors.surface },
  chip: { padding: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, minHeight: 44, justifyContent: 'center' },
  chipOn: { borderColor: colors.signal, backgroundColor: colors.signal },
  chipText: { color: colors.ink, fontWeight: '700' },
  pill: { paddingHorizontal: space.md, minHeight: 36, justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: colors.line },
  remove: { color: colors.alert, fontWeight: '600', paddingVertical: space.xs },
  linkText: { color: colors.ink, fontWeight: '700', textDecorationLine: 'underline' },
});
