import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { SignalText } from './signal-text';
import { layout, motion, palette, radius, shadows, gradients } from './tokens';

export type SignalButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  /** primary = one dominant orange action per task section; outline = secondary; quiet = tertiary text action. */
  variant?: 'primary' | 'outline' | 'quiet';
  /** Action verb first: "Approve call", "Send report", "Try again". */
  label: string;
  /** Label shown while `loading`, e.g. "Requesting call…". A spinner alone is never enough. */
  loadingLabel?: string;
  loading?: boolean;
  /** Trailing glyph/icon node. Primary and outline show an arrow in the reference. */
  trailing?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Primary label is charcoal on orange (white-on-bright-orange fails contrast at this size).
 * Loading keeps the same width, swaps the label, blocks repeat taps and sets busy state.
 */
export function SignalButton({
  variant = 'primary',
  label,
  loadingLabel,
  loading,
  trailing,
  disabled,
  style,
  onPress,
  ...rest
}: SignalButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      hitSlop={variant === 'quiet' ? 8 : 0}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        variants[variant],
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? <ActivityIndicator size="small" color={palette.text} /> : null}
      <SignalText
        variant={variant === 'primary' ? 'button' : 'label'}
        color={variant === 'primary' ? 'text' : variant === 'outline' ? 'accentInk' : 'textSecondary'}
        style={[
          variant === 'primary' && styles.primaryLabel,
          variant === 'outline' && styles.semibold,
          variant === 'quiet' && styles.regular,
        ]}>
        {loading && loadingLabel ? loadingLabel : label}
      </SignalText>
      {!loading && trailing ? trailing : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouch,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  primaryLabel: { flex: 1, textAlign: 'center' },
  semibold: { fontWeight: '600' },
  regular: { fontWeight: '400' },
  disabled: { opacity: 0.5 },
});

const variants = {
  primary: {
    minHeight: layout.primaryButtonHeight,
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    backgroundColor: palette.accent,
    backgroundImage: gradients.primaryAction,
    boxShadow: shadows.primary,
  },
  outline: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,250,243,0.72)',
    borderColor: palette.accentInk,
  },
  quiet: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
} as const satisfies Record<string, ViewStyle>;

const pressedStyles = {
  primary: { backgroundImage: 'none', backgroundColor: palette.accentPressed, transform: [{ scale: motion.pressScale }] },
  outline: { backgroundColor: palette.accentSoft },
  quiet: { opacity: 0.6 },
} as const satisfies Record<string, ViewStyle>;
