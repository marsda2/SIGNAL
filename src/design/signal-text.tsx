import { Text, type TextProps } from 'react-native';

import { palette, type PaletteColor, type TypeVariant, type } from './tokens';

export type SignalTextProps = TextProps & {
  variant?: TypeVariant;
  /** Palette key. Defaults to charcoal `text`. Never use `accent` for small text — use `accentInk`. */
  color?: PaletteColor;
};

const defaultColor: Partial<Record<TypeVariant, PaletteColor>> = {
  meta: 'textMuted',
  wordmark: 'text',
};

/** Single text primitive. Uses the platform system sans (no bundled font) per the kit. */
export function SignalText({ variant = 'body', color, style, ...rest }: SignalTextProps) {
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        { color: palette[color ?? defaultColor[variant] ?? 'text'] },
        variant === 'wordmark' && { textTransform: 'uppercase' },
        // Timestamps and elapsed time use tabular numerals.
        (variant === 'meta' || variant === 'eta') && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
