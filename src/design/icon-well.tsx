import { StyleSheet, View } from 'react-native';

import { Glyph, type GlyphName } from './glyph';
import { layout, palette, radius, type PaletteColor } from './tokens';

export type IconWellTone = 'neutral' | 'accent' | 'success' | 'failure' | 'solid';

const tones: Record<IconWellTone, { bg: string; ink: PaletteColor }> = {
  neutral: { bg: palette.surfaceSunken, ink: 'text' },
  accent: { bg: palette.accentSoft, ink: 'accent' },
  success: { bg: palette.success, ink: 'onAccent' },
  failure: { bg: palette.errorSoft, ink: 'errorInk' },
  solid: { bg: palette.surfaceSolid, ink: 'text' },
};

/** Soft container for one outline icon: circle (rows, avatars) or rounded square (room card). Decorative. */
export function IconWell({
  name,
  tone = 'neutral',
  size = layout.iconWell,
  shape = 'circle',
}: {
  name: GlyphName;
  tone?: IconWellTone;
  size?: number;
  shape?: 'circle' | 'square';
}) {
  const t = tones[tone];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.well,
        { width: size, height: size, borderRadius: shape === 'circle' ? size / 2 : radius.well, backgroundColor: t.bg },
        tone === 'solid' && styles.solid,
      ]}>
      <Glyph name={name} size={Math.round(size * 0.5)} color={t.ink} />
    </View>
  );
}

const styles = StyleSheet.create({
  well: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  solid: { borderWidth: 1, borderColor: palette.hairline },
});
