import { StyleSheet, View, type ViewProps } from 'react-native';

import { layout, palette, radius, shadows } from './tokens';

export type GlassCardProps = ViewProps & {
  /** `strong` = reading-heavy surfaces and inputs; `solid` = opaque fallback (reduced transparency). */
  surface?: 'glass' | 'strong' | 'solid';
  /** Corner radius token. Cards 22, tiles/strips 18. */
  rounded?: 'card' | 'tile' | 'strip' | 'pill';
  /** Remove the default 18px padding. */
  flush?: boolean;
};

const fills = {
  glass: palette.surfaceGlass,
  strong: palette.surfaceGlassStrong,
  solid: palette.surfaceSolid,
} as const;

/**
 * Frosted surface: near-white warm fill + white hairline + soft diffuse shadow.
 * No backdrop blur is applied: do not nest blurred surfaces, and child controls reuse a translucent fill.
 * Padding is fixed (no window measurement) so server-rendered and hydrated styles match.
 */
export function GlassCard({ surface = 'strong', rounded = 'card', flush, style, ...rest }: GlassCardProps) {
  return (
    <View
      {...rest}
      style={[styles.base, { backgroundColor: fills[surface], borderRadius: radius[rounded] }, !flush && styles.padded, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: palette.border,
    boxShadow: shadows.soft,
  },
  padded: { padding: layout.cardPadding },
});
