import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native';

import { SignalText } from './signal-text';
import { layout, motion, palette, radius, shadows } from './tokens';

export type SignalButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  /** primary = one dominant orange action per task section; outline = secondary; quiet = tertiary text action. */
  variant?: 'primary' | 'outline' | 'quiet';
  /** `sm` = compact pill for inline actions inside cards and chat. */
  size?: 'md' | 'sm';
  /** Action verb first: "Approve call", "Send report", "Try again". */
  label: string;
  /** Label shown while `loading`, e.g. "Requesting call…". A spinner alone is never enough. */
  loadingLabel?: string;
  loading?: boolean;
  /** Leading glyph/icon node, e.g. a check on "That fixed it". */
  leading?: React.ReactNode;
  /** Trailing glyph/icon node. Primary shows an arrow in the reference. */
  trailing?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Concept-board button: white label on signal orange with a soft orange glow; outline = orange hairline + orange ink.
 * Loading keeps the same width, swaps the label, blocks repeat taps and sets busy state.
 */
export function SignalButton({
  variant = 'primary',
  size = 'md',
  label,
  loadingLabel,
  loading,
  leading,
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
      hitSlop={variant === 'quiet' || size === 'sm' ? 8 : 0}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        variants[variant],
        size === 'sm' && styles.small,
        pressed && pressedStyles[variant],
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? <ActivityIndicator size="small" color={variant === 'primary' ? palette.onAccent : palette.text} /> : null}
      {!loading && leading ? leading : null}
      <SignalText
        variant={variant === 'primary' && size === 'md' ? 'button' : 'label'}
        color={variant === 'primary' ? 'onAccent' : variant === 'outline' ? 'accentInk' : 'textSecondary'}
        style={[styles.label, variant === 'quiet' ? styles.regular : styles.semibold]}>
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
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  small: { minHeight: 38, alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 14, gap: 6 },
  /** Long labels ("Add my report to T-102 and escalate") wrap centered next to the arrow. */
  label: { flexShrink: 1, textAlign: 'center' },
  semibold: { fontWeight: '600' },
  regular: { fontWeight: '400' },
  disabled: { opacity: 0.5 },
});

const variants = {
  primary: {
    minHeight: layout.primaryButtonHeight,
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 22,
    backgroundColor: palette.accent,
    borderColor: palette.accent,
    boxShadow: shadows.primary,
  },
  outline: {
    alignSelf: 'stretch',
    backgroundColor: palette.surfaceGlassStrong,
    borderColor: palette.accent,
  },
  quiet: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
} as const satisfies Record<string, ViewStyle>;

const pressedStyles = {
  primary: { backgroundColor: palette.accentPressed, borderColor: palette.accentPressed, boxShadow: shadows.primaryPressed, transform: [{ scale: motion.pressScale }] },
  outline: { backgroundColor: palette.accentSoft },
  quiet: { opacity: 0.6 },
} as const satisfies Record<string, ViewStyle>;
