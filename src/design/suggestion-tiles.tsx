import { Children, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Glyph, type GlyphName } from './glyph';
import { SignalText } from './signal-text';
import { layout, palette, radius, shadows } from './tokens';

export type SuggestionTileProps = {
  label: string;
  /** One outline icon. */
  icon: GlyphName;
  /** Optional second line, e.g. "FAQ" or "Reported 2 days ago". */
  detail?: string;
  onPress: () => void;
  /** Concept-board "Selected": peach fill, orange icon and ink. */
  selected?: boolean;
  /** Concept-board "Unavailable": frosted, muted, not pressable. */
  disabled?: boolean;
  /** `center` for one-word equipment tiles; `start` for longer questions. */
  align?: 'center' | 'start';
  accessibilityLabel?: string;
};

/** Equipment / topic tile. Quieter than the primary action; grows vertically for long or translated labels. */
export function SuggestionTile({ label, icon, detail, onPress, selected, disabled, align = 'center', accessibilityLabel }: SuggestionTileProps) {
  const start = align === 'start';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (detail ? `${label}, ${detail}` : label)}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, start && styles.tileStart, (pressed || selected) && styles.selected, disabled && styles.unavailable]}>
      {({ pressed }) => {
        const on = (pressed || selected) && !disabled;
        return (
          <>
            <Glyph name={icon} size={start ? 22 : 26} color={disabled ? 'textDisabled' : on ? 'accent' : 'text'} />
            <View style={[styles.text, start && styles.textStart]}>
              <SignalText
                variant="label"
                color={disabled ? 'textDisabled' : on ? 'accentInk' : 'text'}
                style={[styles.label, start && styles.labelStart]}
                numberOfLines={3}>
                {label}
              </SignalText>
              {detail ? (
                <SignalText variant="meta" color={disabled ? 'textDisabled' : 'textMuted'} style={!start && styles.center} numberOfLines={1}>
                  {detail}
                </SignalText>
              ) : null}
            </View>
          </>
        );
      }}
    </Pressable>
  );
}

/** Tile grid ("In this space"). Rows of `columns` equal tiles; the last row keeps tile widths. */
export function SuggestionTiles({ children, columns = 3 }: { children: ReactNode; columns?: number }) {
  const tiles = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < tiles.length; i += columns) rows.push(tiles.slice(i, i + columns));
  return (
    <View accessibilityRole="menu" style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((tile, c) => (
            <View key={c} style={styles.cell}>
              {tile}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, k) => (
            <View key={`pad-${k}`} style={styles.cell} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, minWidth: 0 },
  tile: {
    flex: 1,
    minHeight: layout.tileMinHeight,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceGlassStrong,
    boxShadow: shadows.soft,
  },
  tileStart: { alignItems: 'flex-start', justifyContent: 'flex-start', paddingHorizontal: 14, gap: 12 },
  selected: { backgroundColor: palette.accentSoft, borderColor: palette.accentLine },
  unavailable: { backgroundColor: 'rgba(239,233,226,0.6)', borderColor: 'rgba(255,255,255,0.5)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
  text: { gap: 2, alignItems: 'center', alignSelf: 'stretch' },
  textStart: { alignItems: 'flex-start' },
  label: { textAlign: 'center', fontWeight: '500' },
  labelStart: { textAlign: 'left', fontWeight: '600' },
  center: { textAlign: 'center' },
});
