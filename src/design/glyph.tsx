import { Text } from 'react-native';

import { palette, type PaletteColor } from './tokens';

export type GlyphName = 'arrow-right' | 'arrow-left' | 'check' | 'alert' | 'mic' | 'dots' | 'person' | 'wrench';

const chars: Record<GlyphName, string> = {
  'arrow-right': '→',
  'arrow-left': '←',
  check: '✓',
  alert: '!',
  mic: '●',
  dots: '•••',
  person: '☺',
  wrench: '✎',
};

/**
 * PLACEHOLDER icon. The kit calls for ONE outline icon family (20–22px, ~1.75px stroke, rounded caps).
 * Pick the family once (e.g. `@expo/vector-icons` Feather/Lucide) and replace this component's body —
 * every design component imports icons through here, so nothing else changes.
 */
export function Glyph({ name, size = 20, color = 'text' }: { name: GlyphName; size?: number; color?: PaletteColor }) {
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      style={{ color: palette[color], fontSize: size, lineHeight: size + 4, fontWeight: '600' }}>
      {chars[name]}
    </Text>
  );
}
