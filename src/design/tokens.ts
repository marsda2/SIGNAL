/**
 * SIGNAL design tokens — source of truth is docs/UI-STYLE-GUIDE.md (derived from SIGNAL-Brand-UI-Kit v1.0).
 * Light-only by design: the brand is warm ivory + charcoal + orange. Do not add a dark palette without a design pass.
 * Values are reconstruction targets from the reference image; the kit's written tokens are authoritative.
 */

export const palette = {
  canvas: '#E7E0D8',
  canvasLight: '#F5EEE6',
  canvasShade: '#CFC6BC',
  surfaceSolid: '#F4EDE5',
  surfaceGlass: 'rgba(255,250,243,0.66)',
  surfaceGlassStrong: 'rgba(255,250,243,0.88)',
  surfaceUser: 'rgba(92,83,75,0.12)',

  text: '#25221F',
  textSecondary: '#625B54',
  textMuted: '#70675E',

  accent: '#FF641F',
  accentLight: '#FF7938',
  accentPressed: '#F55C15',
  accentInk: '#A83A0B',
  accentSoft: '#FFE4D3',

  success: '#42A34B',
  successInk: '#2D7134',
  successSoft: '#E0EFDC',
  errorInk: '#A33228',

  focus: '#A83A0B',

  border: 'rgba(255,255,255,0.66)',
  divider: 'rgba(64,49,36,0.09)',
} as const;

export type PaletteColor = keyof typeof palette;

/** Orange = action/attention, green = verified success, red = failure. Never rely on color alone for state. */
export const gradients = {
  screen: 'linear-gradient(145deg, #DED5CB 0%, #F2E9DE 52%, #DCD3C8 100%)',
  primaryAction: 'linear-gradient(110deg, #FF641F 0%, #FF7938 100%)',
} as const;

export const shadows = {
  soft: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 8px 24px rgba(66,46,28,0.06)',
  floating: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 5px 14px rgba(66,46,28,0.08)',
  primaryHover: 'inset 0 1px 0 rgba(255,255,255,0.24), 0 4px 12px rgba(111,47,13,0.12)',
  primary: 'inset 0 1px 0 rgba(255,255,255,0.24)',
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
  cardPadding: 20,
  cardPaddingCompact: 16,
  minTouch: 44,
  primaryButtonHeight: 52,
  composerHeight: 64,
  micSize: 48,
  tileMinHeight: 88,
  statusIcon: 24,
  statusRowMinHeight: 56,
} as const;

export const radius = {
  card: 24,
  tile: 20,
  bubble: 22,
  bubbleTail: 8,
  strip: 20,
  pill: 999,
} as const;

/** Sizes are px; letterSpacing is the kit's em value × fontSize (RN uses px). */
export const type = {
  title: { fontSize: 30, lineHeight: 35, fontWeight: '600', letterSpacing: -1.05 },
  section: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.36 },
  hero: { fontSize: 18, lineHeight: 26, fontWeight: '400', letterSpacing: -0.27 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400', letterSpacing: -0.16 },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '600', letterSpacing: -0.16 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: -0.14 },
  meta: { fontSize: 12, lineHeight: 18, fontWeight: '400', letterSpacing: 0 },
  wordmark: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 4.2 },
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
