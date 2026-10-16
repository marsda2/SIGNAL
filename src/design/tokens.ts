/**
 * SIGNAL design tokens — source of truth is docs/UI-STYLE-GUIDE.md (Brand & UI concept board, 2026-10-16).
 * Light-only by design: warm ivory + charcoal + signal orange, green only for verified success.
 * Do not add a dark palette without a design pass.
 */

export const palette = {
  /** Warm ivory field ("Warm ivory" swatch). Never pure white or cool-toned. */
  canvas: '#F4EFE9',
  canvasLight: '#F9F6F1',
  canvasShade: '#E6DFD7',
  /** Cards, tiles, bubbles: near-white with a warm cast. */
  surfaceSolid: '#FFFCF8',
  surfaceGlass: 'rgba(255,253,250,0.84)',
  surfaceGlassStrong: 'rgba(255,253,250,0.96)',
  /** "Frosted surfaces": number badges, disabled controls, neutral wells. */
  surfaceSunken: '#EFE9E2',
  /** Visitor chat bubble: soft peach. */
  surfaceUser: '#FCDDCB',

  text: '#26221F',
  textSecondary: '#5E5852',
  textMuted: '#6E6760',
  textDisabled: '#A69E96',

  /** Signal orange: action surfaces and small attention accents only. */
  accent: '#F66216',
  accentLight: '#FF7E3B',
  accentPressed: '#E25510',
  /** Orange text, outline labels, focus (≥4.5:1 on ivory and on accentSoft). */
  accentInk: '#B4420C',
  /** Selected tiles, icon wells, pressed states. */
  accentSoft: '#FFE7D8',
  accentLine: '#F9C7A8',
  /** Label/icon on an orange fill (concept board). ~3.2:1 — set to `text` for 5:1 charcoal labels. */
  onAccent: '#FFFFFF',

  success: '#3A9444',
  successInk: '#2A7031',
  successSoft: '#E7F3E3',
  successLine: '#C9E2C3',
  errorInk: '#A33228',
  errorSoft: '#FBE6E1',

  focus: '#B4420C',

  border: 'rgba(255,255,255,0.92)',
  hairline: 'rgba(70,52,36,0.08)',
  divider: 'rgba(64,49,36,0.09)',
} as const;

export type PaletteColor = keyof typeof palette;

/**
 * Orange = action/attention, green = verified success, red = failure. Never rely on color alone for state.
 * Not applied on server-rendered routes: RN-web drops `backgroundImage` during SSR (hydration mismatch).
 */
export const gradients = {
  screen: 'linear-gradient(160deg, #F7F3EE 0%, #F4EFE9 55%, #EEE7DF 100%)',
  primaryAction: 'linear-gradient(110deg, #F66216 0%, #FF7E3B 100%)',
} as const;

/** Shallow, warm, diffuse. No heavy gray drops, bevels or neumorphic grooves. */
export const shadows = {
  soft: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 1px 2px rgba(80,58,38,0.05), 0 10px 26px rgba(80,58,38,0.08)',
  floating: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 2px 6px rgba(80,58,38,0.06), 0 14px 32px rgba(80,58,38,0.11)',
  primary: '0 8px 18px rgba(246,98,22,0.26)',
  primaryHover: '0 10px 22px rgba(246,98,22,0.32)',
  primaryPressed: '0 3px 8px rgba(246,98,22,0.2)',
} as const;

/** Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const layout = {
  /** Centered single column; stays a focused mobile composition on tablet/web. */
  maxWidth: 440,
  screenPadding: 20,
  screenPaddingCompact: 16,
  compactBreakpoint: 360,
  stackGap: 16,
  cardPadding: 18,
  cardPaddingCompact: 16,
  minTouch: 44,
  primaryButtonHeight: 52,
  composerHeight: 62,
  micSize: 50,
  tileMinHeight: 96,
  statusIcon: 24,
  statusRowMinHeight: 56,
  iconWell: 44,
  avatar: 36,
} as const;

export const radius = {
  card: 22,
  tile: 18,
  bubble: 20,
  bubbleTail: 6,
  strip: 18,
  well: 14,
  pill: 999,
} as const;

/** Sizes are px; letterSpacing is the em value × fontSize (RN uses px). System sans only. */
export const type = {
  display: { fontSize: 38, lineHeight: 42, fontWeight: '700', letterSpacing: -1.3 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.8 },
  section: { fontSize: 17, lineHeight: 23, fontWeight: '600', letterSpacing: -0.3 },
  hero: { fontSize: 18, lineHeight: 26, fontWeight: '400', letterSpacing: -0.25 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400', letterSpacing: -0.15 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: -0.1 },
  label: { fontSize: 14, lineHeight: 19, fontWeight: '500', letterSpacing: -0.1 },
  meta: { fontSize: 12, lineHeight: 17, fontWeight: '400', letterSpacing: 0 },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '600', letterSpacing: 2.2 },
  wordmark: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: 5.4 },
  eta: { fontSize: 28, lineHeight: 34, fontWeight: '500', letterSpacing: -0.84 },
} as const;

export type TypeVariant = keyof typeof type;

export const motion = {
  press: 140,
  cardReveal: 220,
  status: 180,
  screen: 250,
  /** cubic-bezier(.2,.8,.2,1) — pass to Easing.bezier(...motion.easing) */
  easing: [0.2, 0.8, 0.2, 1] as const,
  pressScale: 0.985,
  revealOffset: 6,
} as const;

/** Visitor-facing microcopy from the kit. Keep wording here so screens stay consistent. */
export const copy = {
  welcome: 'Hi, I’m your space.',
  prompt: 'What can I help you with?',
  inputHint: 'Tell me what’s wrong',
  diagnosis: 'Let’s get this working.',
  progressHeading: 'Checking the room',
  escalationTitle: 'Call maintenance?',
  escalationBody: 'I’ll share the issue and room number.',
  approve: 'Approve call',
  approving: 'Requesting call…',
  keepTroubleshooting: 'Keep troubleshooting',
  confirmed: 'Maintenance confirmed',
  outcome: 'Help is on the way.',
  viewUpdates: 'View updates',
  etaPending: 'Arrival time pending',
  noAnswer: 'Maintenance hasn’t answered yet',
  micBlocked: 'Microphone unavailable. You can type instead.',
} as const;
