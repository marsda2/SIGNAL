import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from './glass-card';
import { SignalText } from './signal-text';
import { StatusMark, type StatusKind } from './status';

export type TimelineStep = {
  kind: StatusKind;
  /** Each label reflects separate evidence: "Issue reported", "Call placed", "Visit confirmed". */
  label: string;
  time?: string;
};

/** Ordered vertical timeline: 24px marks joined by a thin green line. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <View accessibilityRole="list" style={styles.timeline}>
      {steps.map((step, i) => (
        <View key={step.label} style={styles.step}>
          <View style={styles.rail}>
            <StatusMark kind={step.kind} />
            {i < steps.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.stepText}>
            <SignalText variant="label">{step.label}</SignalText>
            {step.time ? <SignalText variant="meta">{step.time}</SignalText> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export type ConfirmationCardProps = {
  /** Confirmed assignee line, e.g. "Alex from Maintenance is heading to Room 204". Omit until confirmed. */
  assignee?: string;
  /** Only pass an ETA that came from maintenance; otherwise the pending copy is shown. */
  eta?: string;
  steps: TimelineStep[];
  children?: ReactNode;
};

/** Glass card for the confirmed-escalation screen. Pair the status chip above it, ticket strip below. */
export function ConfirmationCard({ assignee, eta, steps, children }: ConfirmationCardProps) {
  return (
    <GlassCard>
      {assignee ? <SignalText variant="label">{assignee}</SignalText> : null}
      <SignalText variant={eta ? 'eta' : 'label'} color={eta ? 'text' : 'textSecondary'} style={styles.eta}>
        {eta ?? 'Arrival time pending'}
      </SignalText>
      <Timeline steps={steps} />
      {children}
    </GlassCard>
  );
}

/** Compact ticket row: reference on the left, follow-up action on the right. Wraps on narrow screens. */
export function TicketStrip({ reference, action }: { reference: string; action: ReactNode }) {
  return (
    <GlassCard rounded="strip" flush style={styles.strip}>
      <SignalText variant="label" style={styles.ref}>
        {reference}
      </SignalText>
      {action}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  eta: { marginTop: 4 },
  timeline: { marginTop: 20 },
  step: { flexDirection: 'row', gap: 12 },
  rail: { alignItems: 'center', width: 24 },
  line: { flex: 1, width: 1, marginVertical: 4, backgroundColor: 'rgba(45,113,52,0.3)', minHeight: 12 },
  stepText: { flex: 1, minWidth: 0, gap: 2, paddingBottom: 20 },
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  ref: { flexShrink: 1 },
});
