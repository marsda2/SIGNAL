import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from './glass-card';
import { Glyph, type GlyphName } from './glyph';
import { SignalText } from './signal-text';
import { layout, palette, radius } from './tokens';

/**
 * success = verified/confirmed only · attention = unresolved, needs action · failure = needs attention · pending = in flight.
 * Suggested, attempted, completed and confirmed are different states: do not show "completed" until someone/telemetry confirms it.
 */
export type StatusKind = 'success' | 'attention' | 'failure' | 'pending';

const kinds: Record<StatusKind, { bg: string; ink: keyof typeof palette; glyph: GlyphName; label: string }> = {
  success: { bg: palette.successSoft, ink: 'successInk', glyph: 'check', label: 'Done' },
  attention: { bg: palette.accentSoft, ink: 'accentInk', glyph: 'alert', label: 'Needs attention' },
  failure: { bg: palette.accentSoft, ink: 'errorInk', glyph: 'alert', label: 'Failed' },
  pending: { bg: 'rgba(92,83,75,0.12)', ink: 'textSecondary', glyph: 'dots', label: 'In progress' },
};

/** 24px circle with a glyph. Always paired with a readable label — color is never the only signal. */
export function StatusMark({ kind }: { kind: StatusKind }) {
  const k = kinds[kind];
  return (
    <View accessible accessibilityLabel={k.label} style={[styles.mark, { backgroundColor: k.bg }]}>
      <Glyph name={k.glyph} size={kind === 'pending' ? 8 : 14} color={k.ink} />
    </View>
  );
}

export type StatusRowProps = {
  kind: StatusKind;
  title: string;
  detail?: string;
  /** Right-aligned metadata, e.g. "10:32 AM". Rendered with tabular numerals. */
  time?: string;
};

export function StatusRow({ kind, title, detail, time }: StatusRowProps) {
  return (
    <View style={styles.row}>
      <StatusMark kind={kind} />
      <View style={styles.rowText}>
        <SignalText variant="label">{title}</SignalText>
        {detail ? <SignalText variant="meta">{detail}</SignalText> : null}
      </View>
      {time ? <SignalText variant="meta">{time}</SignalText> : null}
    </View>
  );
}

/** Heading + 2–3 concise rows with hairline dividers ("Checking the room"). */
export function StatusCard({ title, children }: { title: string; children: ReactNode }) {
  const rows = Array.isArray(children) ? children : [children];
  return (
    <GlassCard accessibilityRole="summary" accessibilityLabel={title}>
      <SignalText variant="section" accessibilityRole="header">
        {title}
      </SignalText>
      <View style={styles.list}>
        {rows.map((row, i) => (
          <View key={i} style={i > 0 && styles.divider}>
            {row}
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

/** Small pill: dot + readable text ("Maintenance confirmed"). Only show success after real confirmation. */
export function StatusChip({ kind = 'success', label }: { kind?: StatusKind; label: string }) {
  const dot = kind === 'success' ? palette.success : kind === 'pending' ? palette.textMuted : palette.accent;
  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[styles.chip, kind === 'success' && { backgroundColor: 'rgba(224,239,220,0.8)' }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <SignalText variant="label" color={kind === 'success' ? 'successInk' : 'text'}>
        {label}
      </SignalText>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: layout.statusIcon,
    height: layout.statusIcon,
    borderRadius: layout.statusIcon / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: layout.statusRowMinHeight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  list: { marginTop: 4 },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: layout.minTouch - 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceGlass,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
