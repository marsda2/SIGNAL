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
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, disabled && { opacity: 0.5 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const BADGE = {
  neutral: { bg: palette.surfaceSunken, line: palette.hairline, dot: palette.textMuted, fg: palette.text },
  ok: { bg: palette.successSoft, line: palette.successLine, dot: palette.success, fg: palette.successInk },
  warn: { bg: palette.accentSoft, line: palette.accentLine, dot: palette.accent, fg: palette.accentInk },
  alert: { bg: palette.errorSoft, line: 'rgba(163,50,40,0.18)', dot: palette.errorInk, fg: palette.errorInk },
} as const;

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'ok' | 'warn' | 'alert' }) {
  // green = verified success only, orange = unresolved/attention, red = failure. Dot + words, never color alone.
  const t = BADGE[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.line }]}>
      <View style={[styles.dot, { backgroundColor: t.dot }]} />
      <Text style={{ color: t.fg, fontSize: 12, lineHeight: 16, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export const text = StyleSheet.create({
  h1: { color: colors.ink, ...type.title },
  h2: { color: colors.ink, ...type.section },
  body: { color: colors.ink, ...type.body },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  mono: { color: palette.textMuted, fontSize: 12, lineHeight: 18, fontFamily: 'monospace' as never },
});

const styles = StyleSheet.create({
  // Flat canvas: `backgroundImage` gradients are dropped by RN-web SSR and cause a hydration mismatch.
  screen: { flex: 1, backgroundColor: colors.paper, padding: space.md, gap: space.md },
  card: {
    backgroundColor: palette.surfaceGlassStrong,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 18,
    gap: 10,
    boxShadow: shadows.soft,
  },
  button: {
    backgroundColor: colors.signal,
    borderRadius: 999,
    minHeight: 50,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadows.primary,
  },
  buttonPressed: { backgroundColor: palette.accentPressed, boxShadow: shadows.primaryPressed, transform: [{ scale: 0.985 }] },
  buttonText: { color: palette.onAccent, ...type.button },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
