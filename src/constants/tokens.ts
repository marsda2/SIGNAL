// Brand tokens from docs/05_BRAND_AND_UX.md (mirrors examples/design-tokens.css).
export const colors = {
  ink: '#192831',
  signal: '#D5FF72',
  sea: '#2C766C',
  paper: '#F7F8F4',
  surface: '#FFFFFF',
  muted: '#617077',
  line: '#E2E7E4',
  alert: '#C55236',
  warning: '#E2B157',
} as const;

export const radius = { sm: 10, md: 16, lg: 24 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

// Fixed demo location until real NFC tag -> location mapping lives in SurrealDB Core.
export const DEMO_LOCATION = { id: 'room204', name: 'Conference Room 204' } as const;
