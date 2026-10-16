import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { GlassCard } from './glass-card';
import { Glyph, type GlyphName } from './glyph';
import { SignalText } from './signal-text';
import { layout, palette, radius, type PaletteColor } from './tokens';

/**
 * success = verified/confirmed only · attention = unresolved, needs action · failure = needs attention · pending = in flight.
 * Suggested, attempted, completed and confirmed are different states: do not show "completed" until someone/telemetry confirms it.
 */
export type StatusKind = 'success' | 'attention' | 'failure' | 'pending';

const kinds: Record<StatusKind, { bg: string; ink: PaletteColor; glyph: GlyphName; label: string }> = {
  success: { bg: palette.success, ink: 'onAccent', glyph: 'check', label: 'Done' },
  attention: { bg: palette.accentSoft, ink: 'accentInk', glyph: 'alert', label: 'Needs attention' },
  failure: { bg: palette.errorSoft, ink: 'errorInk', glyph: 'x', label: 'Failed' },
  pending: { bg: palette.surfaceSunken, ink: 'textSecondary', glyph: 'dots', label: 'In progress' },
};

/** 24px filled circle with a glyph. Always paired with a readable label — color is never the only signal. */
export function StatusMark({ kind, size = layout.statusIcon }: { kind: StatusKind; size?: number }) {
  const k = kinds[kind];
  return (
    <View accessible accessibilityLabel={k.label} style={[styles.mark, { width: size, height: size, borderRadius: size / 2, backgroundColor: k.bg }]}>
      <Glyph name={k.glyph} size={Math.round(size * 0.6)} color={k.ink} strokeWidth={kind === 'pending' ? 3.2 : 3} />
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
        <SignalText variant="label" color={kind === 'success' ? 'successInk' : 'text'} style={styles.rowTitle}>
          {title}
        </SignalText>
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

const chipTones: Record<StatusKind, { bg: string; line: string; dot: string; ink: PaletteColor }> = {
  success: { bg: palette.successSoft, line: palette.successLine, dot: palette.success, ink: 'successInk' },
  attention: { bg: palette.accentSoft, line: palette.accentLine, dot: palette.accent, ink: 'accentInk' },
  failure: { bg: palette.errorSoft, line: 'rgba(163,50,40,0.18)', dot: palette.errorInk, ink: 'errorInk' },
  pending: { bg: palette.surfaceSunken, line: palette.hairline, dot: palette.textMuted, ink: 'textSecondary' },
};

/** Small pill: dot + readable text ("Maintenance confirmed", "OPEN"). Only show success after real confirmation. */
export function StatusChip({ kind = 'success', label, live = true }: { kind?: StatusKind; label: string; live?: boolean }) {
  const t = chipTones[kind];
  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion={live ? 'polite' : 'none'}
      style={[styles.chip, { backgroundColor: t.bg, borderColor: t.line }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <SignalText variant="meta" color={t.ink} style={styles.chipText}>
        {label}
      </SignalText>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  row: {
    minHeight: layout.statusRowMinHeight,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontWeight: '600' },
  list: { marginTop: 4 },
  divider: { borderTopWidth: 1, borderTopColor: palette.divider },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontWeight: '600' },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
