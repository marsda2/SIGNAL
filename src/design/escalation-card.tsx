import { StyleSheet, View } from 'react-native';

import { GlassCard } from './glass-card';
import { Glyph } from './glyph';
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
        <View style={styles.icon}>
          <Glyph name="wrench" size={22} color="accentInk" />
        </View>
        <View style={styles.text}>
          <SignalText variant="section" accessibilityRole="header">
            {title}
          </SignalText>
          <SignalText variant="body" color="textSecondary">
            {body}
          </SignalText>
          {consequence ? <SignalText variant="meta">{consequence}</SignalText> : null}
        </View>
      </View>

      {requesting ? (
        <SignalText variant="label" accessibilityRole="text" accessibilityLiveRegion="polite">
          {requestStatus ?? 'Calling maintenance…'}
        </SignalText>
      ) : (
        <View style={styles.actions}>
          <SignalButton
            label={approveLabel}
            trailing={<Glyph name="arrow-right" />}
            onPress={onApprove}
          />
          <SignalButton variant="quiet" label={declineLabel} onPress={onDecline} />
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentSoft,
  },
  text: { flex: 1, minWidth: 0, gap: 4 },
  actions: { gap: 4 },
});
