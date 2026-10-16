import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { GlyphName } from './glyph';
import { IconWell, type IconWellTone } from './icon-well';
import { SignalText } from './signal-text';
import { palette, radius, shadows, type PaletteColor } from './tokens';

export type CalloutTone = 'success' | 'attention' | 'neutral' | 'failure';

const tones: Record<CalloutTone, { bg: string; line: string; well: IconWellTone; title: PaletteColor }> = {
  /** Verified/confirmed only ("Known issue found" with a staff-confirmed fix, "Maintenance confirmed"). */
  success: { bg: palette.successSoft, line: palette.successLine, well: 'success', title: 'text' },
  attention: { bg: palette.accentSoft, line: palette.accentLine, well: 'solid', title: 'text' },
  neutral: { bg: palette.surfaceGlassStrong, line: palette.border, well: 'neutral', title: 'text' },
  failure: { bg: palette.errorSoft, line: 'rgba(163,50,40,0.18)', well: 'failure', title: 'errorInk' },
};

export type CalloutProps = {
  tone?: CalloutTone;
  icon: GlyphName;
  title: string;
  /** Right of the title, e.g. a StatusChip or a time. */
  aside?: ReactNode;
  children?: ReactNode;
  /** Indent the body under the title (default). Turn off for full-width rows such as contact options. */
  inset?: boolean;
  accessibilityLabel?: string;
};

/**
 * Tinted card with a leading status circle and a title row ("Known issue found", "Try this fix",
 * "Maintenance confirmed"). Tone follows evidence: success only after confirmation. Icon + words, never color alone.
 */
export function Callout({ tone = 'neutral', icon, title, aside, children, inset = true, accessibilityLabel }: CalloutProps) {
  const t = tones[tone];
  return (
    <View accessibilityLabel={accessibilityLabel} style={[styles.card, { backgroundColor: t.bg, borderColor: t.line }, tone === 'neutral' && styles.raised]}>
      <View style={styles.head}>
        <IconWell name={icon} tone={t.well} size={36} />
        <SignalText variant="section" color={t.title} style={styles.title}>
          {title}
        </SignalText>
        {aside}
      </View>
      {children ? <View style={[styles.body, inset && styles.inset]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: 1, padding: 14, gap: 8 },
  raised: { boxShadow: shadows.soft },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 21 },
  body: { gap: 6 },
  inset: { paddingLeft: 48 },
});
