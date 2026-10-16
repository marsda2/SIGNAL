import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Pip, PipAvatar } from '@/components/Pip';
import {
  ActionRow,
  Callout,
  ChatBubble,
  Composer,
  ConfirmationCard,
  EscalationCard,
  GlassCard,
  Glyph,
  HeaderIconButton,
  LocationBlock,
  SignalButton,
  SignalHeader,
  SignalScreen,
  SignalText,
  SignalWordmark,
  StatusCard,
  StatusChip,
  StatusRow,
  StepList,
  SuggestionTile,
  SuggestionTiles,
  TicketStrip,
  copy,
  palette,
  type ComposerState,
  type GlyphName,
} from './index';

const EQUIPMENT: { label: string; icon: GlyphName }[] = [
  { label: 'Projector', icon: 'projector' },
  { label: 'Wi-Fi', icon: 'wifi' },
  { label: 'Outlets', icon: 'plug' },
  { label: 'Lights', icon: 'lightbulb' },
  { label: 'AC', icon: 'thermometer' },
  { label: 'Screen', icon: 'monitor' },
  { label: 'HDMI', icon: 'laptop' },
  { label: 'Whiteboard', icon: 'presentation' },
  { label: 'Door', icon: 'door' },
];

const SWATCHES = [
  { key: 'canvas', name: 'Warm ivory' },
  { key: 'surfaceSunken', name: 'Frosted surfaces' },
  { key: 'text', name: 'Charcoal type' },
  { key: 'accent', name: 'Signal orange' },
  { key: 'success', name: 'Success green' },
] as const;

/**
 * Living reference for every SIGNAL component, laid out like the concept board (01 brand · 02 components ·
 * 03 chat & guidance · 04 status & escalation). Mounted at /styleguide. Not part of the visitor flow.
 */
export default function DesignShowcase() {
  const [text, setText] = useState('');
  const [composer, setComposer] = useState<ComposerState>('idle');
  const [requesting, setRequesting] = useState(false);
  const [selected, setSelected] = useState('Projector');

  return (
    <SignalScreen>
      <SignalHeader
        onBack={() => {}}
        right={
          <HeaderIconButton accessibilityLabel="More" onPress={() => {}}>
            <Glyph name="dots" size={22} />
          </HeaderIconButton>
        }
      />
      <ChatBubble from="assistant" leading={<Pip state="idle" size={52} />}>
        Hi, I’m Pip. I know this room. What can I help you with?
      </ChatBubble>
      <LocationBlock room="Conference Room 204" building="2nd Floor · Building A" trailing={<Glyph name="chevron-right" color="textMuted" />} />

      <Section index="01" title="Brand" />
      <GlassCard style={styles.gap}>
        <SignalWordmark size="lg" />
        <SignalText variant="eyebrow">AI-powered issue reporting</SignalText>
        <SignalText variant="display">Every space has a memory.</SignalText>
        <SignalText variant="hero" color="textSecondary">
          A little help, exactly where you need it.
        </SignalText>
      </GlassCard>
      <View style={styles.swatches}>
        {SWATCHES.map((s) => (
          <View key={s.key} style={styles.swatchItem}>
            <View style={[styles.swatch, { backgroundColor: palette[s.key] }]} />
            <SignalText variant="meta" style={styles.centerText}>
              {s.name}
            </SignalText>
            <SignalText variant="meta" color="textMuted" style={styles.centerText}>
              {palette[s.key]}
            </SignalText>
          </View>
        ))}
      </View>

      <Section index="02" title="Components" />
      <View style={styles.sectionHead}>
        <SignalText variant="section">In this space</SignalText>
        <SignalText variant="meta">{EQUIPMENT.length} elements</SignalText>
      </View>
      <SuggestionTiles columns={3}>
        {EQUIPMENT.map((e) => (
          <SuggestionTile key={e.label} label={e.label} icon={e.icon} selected={selected === e.label} onPress={() => setSelected(e.label)} />
        ))}
      </SuggestionTiles>
      <SuggestionTiles columns={3}>
        <SuggestionTile label="Projector" icon="projector" onPress={() => {}} />
        <SuggestionTile label="Projector" icon="projector" selected onPress={() => {}} />
        <SuggestionTile label="Projector" icon="projector" disabled onPress={() => {}} />
      </SuggestionTiles>
      <ActionRow icon="dots" title="Something else" detail="Issue with something not listed" onPress={() => {}} />
      <Composer
        state={composer}
        value={text}
        onChangeText={setText}
        onSend={() => setText('')}
        onStartRecording={() => setComposer('recording')}
        onStopRecording={() => setComposer('idle')}
        elapsed="0:07"
      />
      <Composer value={text} onChangeText={setText} onSend={() => setText('')} />
      <SignalButton label={copy.approve} trailing={<Glyph name="arrow-right" color="onAccent" />} onPress={() => {}} />
      <SignalButton variant="outline" label={copy.viewUpdates} trailing={<Glyph name="arrow-right" color="accentInk" />} onPress={() => {}} />
      <SignalButton variant="quiet" label={copy.keepTroubleshooting} onPress={() => {}} />
      <SignalButton loading loadingLabel={copy.approving} label={copy.approve} onPress={() => {}} />

      <Section index="03" title="Chat & guidance" />
      <ChatBubble from="assistant" leading={<PipAvatar size={34} />}>
        You selected Projector. Here’s what I found.
      </ChatBubble>
      <Callout tone="success" icon="check" title="Known issue found">
        <SignalText variant="label" color="textSecondary" style={styles.regular}>
          This looks similar to a recent issue in this room.
        </SignalText>
      </Callout>
      <Callout icon="file" title="Try this fix">
        <StepList steps={['Make sure the projector is on.', 'Check the HDMI cable is connected.', 'Press the input button on the remote.']} />
      </Callout>
      <SignalText variant="label">Did this solve the problem?</SignalText>
      <View style={styles.row}>
        <SignalButton label="Yes, it’s working" style={styles.flex} onPress={() => {}} />
        <SignalButton variant="outline" label="Still an issue" style={styles.flex} onPress={() => {}} />
      </View>
      <ChatBubble from="user">The screen is not coming down.</ChatBubble>
      <ChatBubble from="assistant" leading={<PipAvatar size={34} />}>
        Thanks! I’ll create a report for the screen issue.
      </ChatBubble>
      <ActionRow icon="monitor" title="Screen" detail="Not working" onPress={() => {}} />
      <SignalButton label="Report issue" trailing={<Glyph name="arrow-right" color="onAccent" />} onPress={() => {}} />

      <Section index="04" title="Status & escalation" />
      <Callout tone="success" icon="check" title={copy.confirmed} aside={<SignalText variant="meta">10:32 AM</SignalText>}>
        <SignalText variant="label" color="textSecondary" style={styles.regular}>
          Your request has been sent to facilities. You’ll get a notification when it’s resolved.
        </SignalText>
      </Callout>
      <EscalationCard
        body="I’ll share the issue and room number with the facilities team."
        consequence="This will call the building’s maintenance team."
        requesting={requesting}
        onApprove={() => setRequesting(true)}
        onDecline={() => {}}
      />
      <StatusCard title={copy.progressHeading}>
        <StatusRow kind="success" title="Reset completed" detail="You confirmed the power cycle" time="10:32 AM" />
        <StatusRow kind="attention" title="Still not working" detail="Needs on-site support" time="10:34 AM" />
        <StatusRow kind="pending" title="Maintenance notified" detail="Waiting for a reply" />
      </StatusCard>
      <View style={styles.row}>
        <StatusChip label={copy.confirmed} />
        <StatusChip kind="attention" label="OPEN" live={false} />
        <StatusChip kind="pending" label="INITIATED" live={false} />
        <StatusChip kind="failure" label="FAILED" live={false} />
      </View>
      <ConfirmationCard
        assignee="Alex from Maintenance is heading to Room 204"
        steps={[
          { kind: 'success', label: 'Issue reported', time: '10:34 AM' },
          { kind: 'success', label: 'Call placed', time: '10:35 AM' },
          { kind: 'pending', label: 'Visit confirmed' },
        ]}
      />
      <TicketStrip
        reference="Ticket #2041"
        action={<SignalButton variant="outline" size="sm" label={copy.viewUpdates} onPress={() => {}} style={styles.stripAction} />}
      />

      <Section index="05" title="Pip states" />
      <GlassCard style={styles.pips}>
        {(['idle', 'listening', 'thinking', 'helping', 'solved', 'escalating'] as const).map((s) => (
          <Pip key={s} state={s} size={52} />
        ))}
      </GlassCard>
    </SignalScreen>
  );
}

function Section({ index, title }: { index: string; title: string }) {
  return (
    <View style={styles.section}>
      <SignalText variant="eyebrow" color="text">
        {index} / {title}
      </SignalText>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  flex: { flex: 1, alignSelf: 'auto' },
  regular: { fontWeight: '400' },
  pips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: 16 },
  section: { marginTop: 20, gap: 10 },
  rule: { height: 1, backgroundColor: palette.divider },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  swatchItem: { alignItems: 'center', gap: 4, width: 62 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    boxShadow: '0 4px 12px rgba(80,58,38,0.12)',
  },
  centerText: { textAlign: 'center' },
  stripAction: { alignSelf: 'auto' },
});
