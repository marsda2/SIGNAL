import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassCard } from './glass-card';
import { Glyph } from './glyph';
import { IconWell } from './icon-well';
import { SignalText } from './signal-text';
import { layout, palette, type PaletteColor } from './tokens';

const BARS = [0.42, 0.72, 1, 0.72, 0.42];

/** The signal mark: five rounded orange bars, tallest in the middle. Plain Views, so it renders on SSR and native. */
export function SignalMark({ height = 16, color = 'accent' }: { height?: number; color?: PaletteColor }) {
  const bar = Math.max(2, Math.round(height * 0.15));
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.mark, { height, gap: bar }]}>
      {BARS.map((h, i) => (
        <View key={i} style={{ width: bar, height: Math.round(height * h), borderRadius: bar, backgroundColor: palette[color] }} />
      ))}
    </View>
  );
}

/** SIGNAL wordmark + mark lockup. */
export function SignalWordmark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const large = size === 'lg';
  return (
    <View accessible accessibilityRole="header" accessibilityLabel="SIGNAL" style={styles.lockup}>
      <SignalText variant="wordmark" style={large ? styles.wordmarkLarge : undefined}>
        SIGNAL
      </SignalText>
      <SignalMark height={large ? 24 : 17} />
    </View>
  );
}

export type SignalHeaderProps = {
  /** Show only when it navigates somewhere real. The side slots stay equal width so the wordmark never shifts. */
  onBack?: () => void;
  /** Optional 44px control for the right slot (e.g. a sound toggle). */
  right?: ReactNode;
};

/** Centered wordmark between two 44px slots. */
export function SignalHeader({ onBack, right }: SignalHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.slot}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Glyph name="chevron-left" size={24} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        <SignalWordmark />
      </View>
      <View style={styles.slot}>{right}</View>
    </View>
  );
}

/** 44px round icon control for header slots. Pass a real accessibility label/role from the caller. */
export function HeaderIconButton({
  children,
  onPress,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityRole?: 'button' | 'switch';
  accessibilityState?: { checked?: boolean };
}) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export type LocationBlockProps = {
  room: string;
  /** e.g. "2nd Floor · Building A". Static label — location comes from NFC context, not a dropdown. */
  building?: string;
  /** Small chip next to the building line, e.g. the NFC verification state. */
  badge?: ReactNode;
  /** Right side: a chevron only when the card opens real details. */
  trailing?: ReactNode;
  /** Extra rows inside the card (errors, notes). */
  children?: ReactNode;
};

/** Room card: building icon well, room name, subdued building/floor line. Static unless wrapped by the caller. */
export function LocationBlock({ room, building, badge, trailing, children }: LocationBlockProps) {
  return (
    <GlassCard rounded="tile" style={styles.room}>
      <View style={styles.roomRow}>
        <IconWell name="building" shape="square" />
        <View style={styles.roomText}>
          <SignalText variant="section" numberOfLines={2}>
            {room}
          </SignalText>
          {building || badge ? (
            <View style={styles.roomMeta}>
              {building ? <SignalText variant="meta">{building}</SignalText> : null}
              {badge}
            </View>
          ) : null}
        </View>
        {trailing}
      </View>
      {children}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: layout.minTouch },
  slot: { width: layout.minTouch, height: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center' },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordmarkLarge: { fontSize: 22, lineHeight: 28, letterSpacing: 8 },
  mark: { flexDirection: 'row', alignItems: 'center' },
  iconButton: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: layout.minTouch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: palette.surfaceSunken },
  room: { paddingVertical: 12, paddingHorizontal: 12, gap: 8 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roomText: { flex: 1, minWidth: 0, gap: 3 },
  roomMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
});
