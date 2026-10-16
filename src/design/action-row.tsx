import { Pressable, StyleSheet, View } from 'react-native';

import { Glyph, type GlyphName } from './glyph';
import { IconWell, type IconWellTone } from './icon-well';
import { SignalText } from './signal-text';
import { layout, palette, radius, shadows } from './tokens';

export type ActionRowProps = {
  icon: GlyphName;
  iconTone?: IconWellTone;
  title: string;
  detail?: string;
  /** `chevron` opens something in-app; `external` leaves the app (tel:, mailto:, another site). */
  trailing?: 'chevron' | 'external' | 'none';
  onPress: () => void;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** Tappable row card ("Something else ›", "Screen · Not working ›"): icon well, title, detail, trailing affordance. */
export function ActionRow({
  icon,
  iconTone = 'neutral',
  title,
  detail,
  trailing = 'chevron',
  onPress,
  accessibilityRole = 'button',
  accessibilityLabel,
  disabled,
}: ActionRowProps) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? (detail ? `${title}, ${detail}` : title)}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>
      <IconWell name={icon} tone={iconTone} size={40} />
      <View style={styles.text}>
        <SignalText variant="label" style={styles.title}>
          {title}
        </SignalText>
        {detail ? <SignalText variant="meta">{detail}</SignalText> : null}
      </View>
      {trailing === 'none' ? null : <Glyph name={trailing === 'external' ? 'external' : 'chevron-right'} size={trailing === 'external' ? 18 : 20} color="textMuted" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.statusRowMinHeight + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceGlassStrong,
    boxShadow: shadows.soft,
  },
  pressed: { backgroundColor: palette.accentSoft, borderColor: palette.accentLine },
  disabled: { opacity: 0.5 },
  text: { flex: 1, minWidth: 0, gap: 1 },
  title: { fontWeight: '600' },
});
