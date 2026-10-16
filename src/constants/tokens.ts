// App-wide tokens. Values come from the SIGNAL design system (src/design/tokens.ts, docs/UI-STYLE-GUIDE.md);
// key names are kept so existing screens restyle without code changes.
import { palette } from '@/design/tokens';

export const colors = {
  ink: palette.text, // charcoal: text + icons
  signal: palette.accent, // primary action orange (label on it: palette.onAccent)
  sea: palette.accentInk, // link / orange text (accent itself is too light for small text)
  paper: palette.canvas, // warm ivory page background
  surface: palette.surfaceSolid, // opaque card / input surface
  muted: palette.textSecondary, // secondary text (4.5:1 on canvas)
  line: 'rgba(64,49,36,0.12)', // dividers / input borders
  alert: palette.errorInk, // failure
  warning: palette.accentSoft, // unresolved / attention fill (pair with accentInk text)
  success: palette.success,
  successInk: palette.successInk,
  successSoft: palette.successSoft,
} as const;

// card 22 · inputs 16 · small chips 12 (SIGNAL concept board)
export const radius = { sm: 12, md: 16, lg: 22 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

// Fixed demo location until real NFC tag -> location mapping lives in SurrealDB Core.
// Default demo space (keep in sync with src/data/demo-spaces.json `defaultSpaceId`).
export const DEMO_LOCATION = { id: 'pitch_area', name: 'Pitch Area' } as const;
