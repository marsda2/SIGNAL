import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from './glass-card';
import { Glyph } from './glyph';
import { SignalText } from './signal-text';
import { layout, shadows, palette } from './tokens';

export type SignalHeaderProps = {
  /** Show only when it navigates somewhere real. The side slots stay equal width so the wordmark never shifts. */
  onBack?: () => void;
};

/** Centered wordmark between two 44px slots. Use the real brand asset for the signal mark when available. */
export function SignalHeader({ onBack }: SignalHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.slot}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={styles.back}>
            <Glyph name="arrow-left" />
          </Pressable>
        ) : null}
      </View>
      <SignalText variant="wordmark" accessibilityRole="header" style={styles.wordmark}>
        SIGNAL
      </SignalText>
      <View style={styles.slot} />
    </View>
  );
}

export type LocationBlockProps = {
  room: string;
  /** e.g. "JFK27 · Floor 2". Static label — location comes from NFC context, not a dropdown. */
  building?: string;
};

/** Room pill + subdued building/floor line. Static: wrap in a Pressable only if it opens real details. */
export function LocationBlock({ room, building }: LocationBlockProps) {
  return (
    <View style={styles.location}>
      <GlassCard rounded="pill" flush style={styles.room}>
        <SignalText variant="label">{room}</SignalText>
      </GlassCard>
      {building ? <SignalText variant="meta">{building}</SignalText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  slot: { width: layout.minTouch, height: layout.minTouch },
  wordmark: { flex: 1, textAlign: 'center' },
  back: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: layout.minTouch / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.surfaceGlass,
    borderWidth: 1,
    borderColor: palette.border,
    boxShadow: shadows.floating,
  },
  location: { alignItems: 'center', gap: 4, marginTop: 4 },
  room: { paddingVertical: 8, paddingHorizontal: 16 },
});
