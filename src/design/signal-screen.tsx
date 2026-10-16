import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, palette } from './tokens';

export type SignalScreenProps = {
  children: ReactNode;
  /** Scrollable column (default). Turn off for fixed layouts where content is guaranteed to fit. */
  scroll?: boolean;
  /** Extra bottom space, e.g. a tab bar inset from `@/constants/theme`. */
  bottomInset?: number;
  contentStyle?: ViewStyle;
};

/**
 * Warm ivory field + centered single column (max 440px) with safe-area padding.
 * Flat fill (no gradient, no window measurement) so server-rendered and hydrated styles match.
 * Keeps the focused mobile composition on tablet/web. No fake status bars, notches or phone frames.
 */
export function SignalScreen({ children, scroll = true, bottomInset = 0, contentStyle }: SignalScreenProps) {
  const insets = useSafeAreaInsets();

  const column: ViewStyle = {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingTop: insets.top + 12,
    paddingBottom: insets.bottom + 20 + bottomInset,
    paddingHorizontal: layout.screenPaddingCompact,
    gap: layout.stackGap,
    ...contentStyle,
  };

  return (
    <View style={styles.root}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.grow, column]} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.grow, column]}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  grow: { flexGrow: 1 },
});
