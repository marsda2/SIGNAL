import { StyleSheet, View, useWindowDimensions, type ViewProps } from 'react-native';

import { layout, palette, radius, shadows } from './tokens';

export type GlassCardProps = ViewProps & {
  /** `strong` = reading-heavy surfaces and inputs; `solid` = opaque fallback (reduced transparency). */
  surface?: 'glass' | 'strong' | 'solid';
  /** Corner radius token. Cards 24, tiles/strips 20. */
  rounded?: 'card' | 'tile' | 'strip' | 'pill';
  /** Remove the default 20px padding (16px on compact screens). */
  flush?: boolean;
};

const fills = {
  glass: palette.surfaceGlass,
  strong: palette.surfaceGlassStrong,
  solid: palette.surfaceSolid,
} as const;

/**
 * Frosted surface. Translucent ivory fill + white hairline + shallow shadow.
 * No backdrop blur is applied: do not nest blurred surfaces, and child controls reuse a translucent fill.
 * To add real blur on a single top-level card, wrap it in `expo-blur` / `expo-glass-effect` — never inside another blur.
 */
export function GlassCard({
  surface = 'glass',
  rounded = 'card',
  flush,
  style,
  ...rest
}: GlassCardProps) {
  const { width } = useWindowDimensions();
  const padding = width < layout.compactBreakpoint ? layout.cardPaddingCompact : layout.cardPadding;

  return (
    <View
      {...rest}
      style={[
        styles.base,
        { backgroundColor: fills[surface], borderRadius: radius[rounded] },
        !flush && { padding },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: palette.border,
    boxShadow: shadows.soft,
  },
});
