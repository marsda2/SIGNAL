import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SignalText } from './signal-text';
import { layout, palette, radius, shadows } from './tokens';

export type SuggestionTileProps = {
  label: string;
  /** One outline icon, 22px. */
  icon: ReactNode;
  onPress: () => void;
};

/** Quiet glass tile. Quieter than the primary action; grows vertically for long/translated labels. */
export function SuggestionTile({ label, icon, onPress }: SuggestionTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
      {icon}
      <SignalText variant="label" style={styles.label}>
        {label}
      </SignalText>
    </Pressable>
  );
}

/** Three equal tiles in a row ("Projector", "Wi-Fi", "Something else"). Use a vertical list if text no longer fits. */
export function SuggestionTiles({ children }: { children: ReactNode }) {
  return (
    <View accessibilityRole="menu" style={styles.row}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: layout.tileMinHeight,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceGlass,
    boxShadow: shadows.soft,
  },
  pressed: { backgroundColor: palette.accentSoft },
  label: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
