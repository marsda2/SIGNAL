import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/constants/tokens';
import { palette, shadows, type } from '@/design/tokens';

export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({ label, onPress, disabled, testID }: { label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'ok' | 'warn' | 'alert' }) {
  // green = verified success only, orange = unresolved/attention, red = failure
  const bg = { neutral: colors.line, ok: colors.successSoft, warn: colors.warning, alert: colors.alert }[tone];
  const fg = { neutral: colors.ink, ok: colors.successInk, warn: palette.accentInk, alert: colors.surface }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export const text = StyleSheet.create({
  h1: { color: colors.ink, ...type.title },
  h2: { color: colors.ink, ...type.section },
  body: { color: colors.ink, ...type.body },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  mono: { color: colors.muted, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' as never },
});

const styles = StyleSheet.create({
  // Flat canvas: `backgroundImage` gradients are dropped by RN-web SSR and cause a hydration mismatch.
  screen: { flex: 1, backgroundColor: colors.paper, padding: space.md, gap: space.md },
  card: {
    backgroundColor: palette.surfaceGlassStrong,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    boxShadow: shadows.soft,
  },
  button: {
    backgroundColor: colors.signal,
    borderRadius: 999,
    minHeight: 48,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.primary,
  },
  buttonText: { color: colors.ink, ...type.button },
  badge: { alignSelf: 'flex-start', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
});
