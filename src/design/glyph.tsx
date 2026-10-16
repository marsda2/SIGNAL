import { Platform, Text } from 'react-native';

import { palette, type PaletteColor } from './tokens';

export type GlyphName =
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'chevron-right'
  | 'chevron-left'
  | 'check'
  | 'alert'
  | 'alert-triangle'
  | 'info'
  | 'x'
  | 'mic'
  | 'dots'
  | 'person'
  | 'wrench'
  | 'building'
  | 'projector'
  | 'monitor'
  | 'wifi'
  | 'door'
  | 'lock'
  | 'laptop'
  | 'presentation'
  | 'lightbulb'
  | 'thermometer'
  | 'plug'
  | 'help'
  | 'file'
  | 'ticket'
  | 'history'
  | 'clock'
  | 'shield-check'
  | 'nfc'
  | 'volume'
  | 'volume-off'
  | 'phone'
  | 'mail'
  | 'external';

const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${2 * r - w}a${r} ${r} 0 0 1 ${-r} ${-r}v${2 * r - h}a${r} ${r} 0 0 1 ${r} ${-r}z`;

/**
 * One outline family on a 24px grid, round caps and joins (paths adapted from Lucide, ISC licence;
 * `projector` is our own). Every design component imports icons through here.
 */
const PATHS: Record<GlyphName, string[]> = {
  'arrow-right': ['M5 12h14', 'm12 5 7 7-7 7'],
  'arrow-left': ['m12 19-7-7 7-7', 'M19 12H5'],
  'arrow-up': ['m5 12 7-7 7 7', 'M12 19V5'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'chevron-left': ['m15 18-6-6 6-6'],
  check: ['M20 6 9 17l-5-5'],
  alert: ['M12 7v6', 'M12 17h.01'],
  'alert-triangle': ['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3', 'M12 9v4', 'M12 17h.01'],
  info: [circle(12, 12, 10), 'M12 16v-4', 'M12 8h.01'],
  x: ['M18 6 6 18', 'm6 6 12 12'],
  mic: ['M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'],
  dots: [circle(12, 12, 1), circle(19, 12, 1), circle(5, 12, 1)],
  person: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', circle(12, 7, 4)],
  wrench: [
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  ],
  building: [rect(4, 2, 16, 20, 2), 'M9 22v-4h6v4', 'M8 6h.01', 'M12 6h.01', 'M16 6h.01', 'M8 10h.01', 'M12 10h.01', 'M16 10h.01', 'M8 14h.01', 'M12 14h.01', 'M16 14h.01'],
  projector: [rect(2.5, 7.5, 19, 9.5, 2.5), circle(15.5, 12.25, 2.5), 'M6 11h3', 'M6 13.5h2', 'M6 17v2', 'M18 17v2'],
  monitor: [rect(2, 3, 20, 14, 2), 'M8 21h8', 'M12 17v4'],
  wifi: ['M12 20h.01', 'M2 8.82a15 15 0 0 1 20 0', 'M5 12.859a10 10 0 0 1 14 0', 'M8.5 16.429a5 5 0 0 1 7 0'],
  door: ['M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14', 'M2 20h20', 'M14 12v.01'],
  lock: [rect(3, 11, 18, 11, 2), 'M7 11V7a5 5 0 0 1 10 0v4'],
  laptop: ['M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16'],
  presentation: ['M2 3h20', 'M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3', 'm7 21 5-5 5 5'],
  lightbulb: ['M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5', 'M9 18h6', 'M10 22h4'],
  thermometer: ['M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z'],
  plug: ['M12 22v-5', 'M9 8V2', 'M15 8V2', 'M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z'],
  help: [circle(12, 12, 10), 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M10 9H8', 'M16 13H8', 'M16 17H8'],
  ticket: ['M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z', 'M13 5v2', 'M13 17v2', 'M13 11v2'],
  history: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  clock: [circle(12, 12, 10), 'M12 6v6l4 2'],
  'shield-check': [
    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
    'm9 12 2 2 4-4',
  ],
  nfc: ['M6 8.32a7.43 7.43 0 0 1 0 7.36', 'M9.46 6.21a11.76 11.76 0 0 1 0 11.58', 'M12.91 4.1a15.91 15.91 0 0 1 .01 15.8', 'M16.37 2a20.16 20.16 0 0 1 0 20'],
  volume: ['M11 5 6 9H2v6h4l5 4V5Z', 'M15.54 8.46a5 5 0 0 1 0 7.07', 'M19.07 4.93a10 10 0 0 1 0 14.14'],
  'volume-off': ['M11 5 6 9H2v6h4l5 4V5Z', 'm22 9-6 6', 'm16 9 6 6'],
  phone: [
    'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
  ],
  mail: [rect(2, 4, 20, 16, 2), 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  external: ['M15 3h6v6', 'M10 14 21 3', 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
};

/** Native has no SVG renderer installed (no react-native-svg): plain characters keep the same API working there. */
const FALLBACK: Record<GlyphName, string> = {
  'arrow-right': '→',
  'arrow-left': '←',
  'arrow-up': '↑',
  'chevron-right': '›',
  'chevron-left': '‹',
  check: '✓',
  alert: '!',
  'alert-triangle': '!',
  info: 'i',
  x: '✕',
  mic: '●',
  dots: '•••',
  person: '☺',
  wrench: '✎',
  building: '▦',
  projector: '▭',
  monitor: '▭',
  wifi: '≋',
  door: '▯',
  lock: '▣',
  laptop: '▭',
  presentation: '▭',
  lightbulb: '☼',
  thermometer: '°',
  plug: '⏚',
  help: '?',
  file: '≡',
  ticket: '#',
  history: '↺',
  clock: '◷',
  'shield-check': '✓',
  nfc: ')))',
  volume: '♪',
  'volume-off': '×',
  phone: '☎',
  mail: '✉',
  external: '↗',
};

export type GlyphProps = {
  name: GlyphName;
  /** Rendered size in px. Kit: 20–22 in tiles and rows, 14 inside status marks. */
  size?: number;
  color?: PaletteColor;
  /** Stroke in 24-grid units; defaults to ~1.75px at 22px and heavier for small marks. */
  strokeWidth?: number;
};

/** Decorative icon: always pair it with visible text or an accessible label on the parent control. */
export function Glyph({ name, size = 20, color = 'text', strokeWidth }: GlyphProps) {
  if (Platform.OS === 'web') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={palette[color]}
        strokeWidth={strokeWidth ?? (size < 18 ? 2.6 : 1.9)}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        style={{ display: 'block', flexShrink: 0 }}>
        {PATHS[name].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  }
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      style={{ color: palette[color], fontSize: size * 0.9, lineHeight: size + 2, width: size, textAlign: 'center', fontWeight: '600' }}>
      {FALLBACK[name]}
    </Text>
  );
}
