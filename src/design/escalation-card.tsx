import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { GlassCard } from './glass-card';
import { Glyph } from './glyph';
import { IconWell } from './icon-well';
import { SignalButton } from './signal-button';
import { SignalText } from './signal-text';
import { copy, palette } from './tokens';

export type EscalationCardProps = {
  title?: string;
  body?: string;
  /** Relevant consequence when needed: "This will call the building’s maintenance team." */
  consequence?: string;
  /** Set after the visitor approves: swaps controls for the in-flight state and blocks repeat calls. */
  requesting?: boolean;
  /** Real request status text while requesting, e.g. "Calling maintenance…". Never render a pending request as success. */
  requestStatus?: string;
  /** Defaults to "Approve call". Set for non-call approvals, e.g. "Create a ticket". */
  approveLabel?: string;
  declineLabel?: string;
  onApprove: () => void;
  onDecline: () => void;
};

/**
 * Inline approval card (not a modal). Order: title → explanation → consequence → Approve call → Keep troubleshooting.
 * When visible it becomes the primary task; don't pin a large composer over it.
 */
export function EscalationCard({
  title = copy.escalationTitle,
  body = copy.escalationBody,
  consequence,
  requesting,
  requestStatus,
  approveLabel = copy.approve,
  declineLabel = copy.keepTroubleshooting,
  onApprove,
  onDecline,
}: EscalationCardProps) {
  return (
    <GlassCard accessibilityLabel={title} style={styles.card}>
      <View style={styles.head}>
        <IconWell name="wrench" tone="accent" size={48} />
        <View style={styles.text}>
          <SignalText variant="section" accessibilityRole="header">
            {title}
          </SignalText>
          <SignalText variant="label" color="textSecondary" style={styles.body}>
            {body}
          </SignalText>
          {consequence ? <SignalText variant="meta">{consequence}</SignalText> : null}
        </View>
      </View>

      {requesting ? (
        <View style={styles.requesting}>
          <ActivityIndicator size="small" color={palette.accent} />
          <SignalText variant="label" accessibilityRole="text" accessibilityLiveRegion="polite">
            {requestStatus ?? 'Calling maintenance…'}
          </SignalText>
        </View>
      ) : (
        <View style={styles.actions}>
          <SignalButton label={approveLabel} trailing={<Glyph name="arrow-right" color="onAccent" />} onPress={onApprove} />
          <SignalButton variant="quiet" label={declineLabel} onPress={onDecline} />
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  head: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  text: { flex: 1, minWidth: 0, gap: 3 },
  body: { fontWeight: '400', lineHeight: 20 },
  requesting: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    backgroundColor: palette.accentSoft,
  },
  actions: { gap: 2 },
});
