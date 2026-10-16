import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ChatBubble,
  Composer,
  ConfirmationCard,
  EscalationCard,
  GlassCard,
  Glyph,
  LocationBlock,
  SignalButton,
  SignalHeader,
  SignalScreen,
  SignalText,
  StatusCard,
  StatusChip,
  StatusRow,
  SuggestionTile,
  SuggestionTiles,
  TicketStrip,
  copy,
  palette,
  type ComposerState,
} from './index';

/**
 * Living reference for every SIGNAL component with the kit's reference copy.
 * Mount on a dev-only route, e.g. src/app/styleguide.tsx:
 *   export { default } from '@/design/showcase';
 * Not part of the visitor flow. Copy patterns out of here, don't import this into real screens.
 */
export default function DesignShowcase() {
  const [text, setText] = useState('');
  const [composer, setComposer] = useState<ComposerState>('idle');
  const [requesting, setRequesting] = useState(false);

  return (
    <SignalScreen>
      <SignalHeader onBack={() => {}} />
      <LocationBlock room="Conference Room 204" building="JFK27 · Floor 2" />

      <Section title="Typography" />
      <GlassCard style={styles.gap}>
        <SignalText variant="title">{copy.welcome}</SignalText>
        <SignalText variant="hero" color="textSecondary">
          {copy.prompt}
        </SignalText>
        <SignalText variant="section">Section heading</SignalText>
        <SignalText variant="body">Body — what can I help you with?</SignalText>
        <SignalText variant="label">Component label</SignalText>
        <SignalText variant="meta">Metadata · 10:32 AM</SignalText>
        <SignalText variant="eta">12 min</SignalText>
      </GlassCard>

      <Section title="Color" />
      <View style={styles.swatches}>
        {(['canvas', 'surfaceSolid', 'text', 'accent', 'success'] as const).map((key) => (
          <View key={key} style={styles.swatchItem}>
            <View style={[styles.swatch, { backgroundColor: palette[key] }]} />
            <SignalText variant="meta">{palette[key]}</SignalText>
          </View>
        ))}
      </View>

      <Section title="Actions" />
      <SignalButton label={copy.approve} trailing={<Glyph name="arrow-right" />} onPress={() => {}} />
      <SignalButton variant="outline" label={copy.viewUpdates} trailing={<Glyph name="arrow-right" color="accentInk" />} onPress={() => {}} />
      <SignalButton variant="quiet" label={copy.keepTroubleshooting} onPress={() => {}} />
      <SignalButton loading loadingLabel={copy.approving} label={copy.approve} onPress={() => {}} />

      <Section title="Suggestion tiles" />
      <SuggestionTiles>
        <SuggestionTile label="Projector" icon={<Glyph name="mic" size={22} />} onPress={() => {}} />
        <SuggestionTile label="Wi-Fi" icon={<Glyph name="dots" size={22} />} onPress={() => {}} />
        <SuggestionTile label="Something else" icon={<Glyph name="dots" size={22} />} onPress={() => {}} />
      </SuggestionTiles>

      <Section title="Composer" />
      <Composer
        state={composer}
        value={text}
        onChangeText={setText}
        onSend={() => setText('')}
        onStartRecording={() => setComposer('recording')}
        onStopRecording={() => setComposer('idle')}
        elapsed="0:07"
      />

      <Section title="Conversation" />
      <ChatBubble from="assistant">{copy.diagnosis}</ChatBubble>
      <ChatBubble from="user">The projector in Room 204 won’t turn on.</ChatBubble>

      <Section title="Status card" />
      <StatusCard title={copy.progressHeading}>
        <StatusRow kind="success" title="Reset completed" detail="You confirmed the power cycle" time="10:32 AM" />
        <StatusRow kind="attention" title="Still not working" detail="Needs on-site support" time="10:34 AM" />
      </StatusCard>

      <Section title="Escalation" />
      <EscalationCard
        consequence="This will call the building’s maintenance team."
        requesting={requesting}
        onApprove={() => setRequesting(true)}
        onDecline={() => {}}
      />

      <Section title="Confirmation" />
      <StatusChip label={copy.confirmed} />
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
        action={<SignalButton variant="outline" label={copy.viewUpdates} onPress={() => {}} style={styles.stripAction} />}
      />
    </SignalScreen>
  );
}

function Section({ title }: { title: string }) {
  return (
    <SignalText variant="meta" style={styles.section}>
      {title.toUpperCase()}
    </SignalText>
  );
}

const styles = StyleSheet.create({
  gap: { gap: 8 },
  section: { marginTop: 16, letterSpacing: 1.2 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatchItem: { alignItems: 'center', gap: 4 },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
  },
  stripAction: { alignSelf: 'auto' },
});
