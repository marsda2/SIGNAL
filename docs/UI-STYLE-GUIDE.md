# SIGNAL UI style guide

Condensed, implementation-facing version of `SIGNAL-Brand-UI-Kit.md` v1.0 for this Expo app. Tokens live in
[`src/design/tokens.ts`](../src/design/tokens.ts); components in [`src/design/`](../src/design/). The kit's written
tokens are authoritative; the reference image is illustrative.

> **Namespace note:** everything here lives in `src/design/` and `docs/`. It does not touch `src/constants/theme.ts`
> or the Expo template components, so it will not collide with the project-setup work. Wire it into screens as you go.

## 1. Character

Calm, contextual, capable, transparent, approachable. Warm ivory surfaces, charcoal type, orange only for action and
attention. Sparse screens, one clear next step, the room always visible.

- Sentence case; brand name always **SIGNAL**.
- No provider/model names, agent logs, or reasoning in visitor UI.
- **Truthful state:** show "checking → requesting → confirmed" as separate states. Only show "Help is on the way." or an
  ETA once maintenance actually confirmed it; otherwise "Arrival time pending". Never render a pending request as success.
- Copy lives in `copy` (tokens.ts). Reuse it.

## 2. Color

| Token | Value | Use |
| --- | --- | --- |
| `canvas` / `canvasLight` / `canvasShade` | `#E7E0D8` / `#F5EEE6` / `#CFC6BC` | Base, lit regions, edge shading (never text) |
| `surfaceSolid` | `#F4EDE5` | Opaque cards / reduced-transparency fallback |
| `surfaceGlass` / `surfaceGlassStrong` | `rgba(255,250,243,.66/.88)` | Cards / inputs & reading-heavy |
| `surfaceUser` | `rgba(92,83,75,.12)` | User chat bubble |
| `text` / `textSecondary` / `textMuted` | `#25221F` / `#625B54` / `#70675E` | Charcoal hierarchy |
| `accent` / `accentLight` / `accentPressed` | `#FF641F` / `#FF7938` / `#F55C15` | Primary action surface only |
| `accentInk` | `#A83A0B` | Orange **text**, outline labels, focus |
| `accentSoft` | `#FFE4D3` | Small icon containers, pressed tiles |
| `success` / `successInk` / `successSoft` | `#42A34B` / `#2D7134` / `#E0EFDC` | Verified success only |
| `errorInk` | `#A33228` | Failures |

Balance ≈ 80% warm neutrals / 15% charcoal / 5% orange + state. Orange = action, green = verified, red = failed. Never
bright orange for small text (use `accentInk`). **Color alone never carries state** — pair with icon + label.
Page background is never pure white or cool-toned.

## 3. Typography

System sans only (no bundled font; omit `fontFamily`). Variants via `<SignalText variant=…>`:

| Variant | Size / line | Weight | Tracking |
| --- | --- | --- | --- |
| `title` (welcome/outcome) | 30 / 35 | 600 | −.035em |
| `section` | 18 / 24 | 600 | −.02em |
| `hero` (supporting line) | 18 / 26 | 400 | −.015em |
| `body` / input | 16 / 24 | 400 | −.01em |
| `button` | 16 / 20 | 600 | −.01em |
| `label` | 14 / 20 | 500 | −.01em |
| `meta` | 12 / 18 | 400 | 0 |
| `wordmark` | 14 / 20 | 500 | +.30em, uppercase |
| `eta` | 28 / 34 | 500 | −.03em |

Never put essential instructions in `meta`. Let titles wrap; don't force one line. Timestamps use tabular numerals
(applied automatically for `meta`/`eta`). Support 200% text size: controls grow, never clip.

## 4. Layout & geometry

- Reference canvas 390px; **centered single column, max 440px**, also on tablet/web. No fake status bars, notches,
  phone frames or home indicators in the app.
- Screen padding 20 (16 below 360px); stack gap 16; related gaps 8/12; section gaps 24/32.
- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64` (`space`).
- Radii: card 24 · tile 20 · bubble 22 (tail corner 8) · strip 20 · buttons/inputs/pills 999.
- Targets ≥ 44×44 (icon buttons, quiet actions use `hitSlop`). Primary button ≥ 52 high, composer ≥ 64, tile ≥ 88,
  status icon 24 inside a ≥ 56 row.

## 5. Surfaces: background & glass

`SignalScreen` renders the ivory gradient (`gradients.screen`) with a solid `canvas` fallback. `GlassCard` = translucent
ivory + white hairline (`rgba(255,255,255,.66)`) + shallow shadow (`shadows.soft`). Shadows are shallow and warm — no
heavy gray drops, bevels, or neumorphic grooves.

- **Do not nest blurred surfaces.** Children of a glass card use a translucent fill, not another blur.
- No blur library is installed. If you want real blur, add `expo-blur` (`npx expo install expo-blur`) and apply it to a
  single top-level card only; keep `surface="solid"` as the reduced-transparency path.
- Increase opacity before increasing blur when readability is weak.
- **Web SSR caveat:** this app renders web on the server (`web.output: "server"`) and RN-web drops `backgroundImage`
  gradients during SSR, which causes a hydration mismatch. `src/components/ui.tsx` and the layout therefore use flat
  `canvas` / `accent` fills. `src/design/*` (`SignalScreen`, `SignalButton`) still use gradients; render them
  client-only or swap to flat fills if you use them on SSR routes.
- **Legacy bridge:** `src/constants/tokens.ts` (`colors`, `radius`) now derives from `src/design/tokens.ts`, so older
  screens restyle automatically. New work should import from `@/design` directly.

## 6. Components

All exported from `@/design`.

| Component | Purpose | Key rules |
| --- | --- | --- |
| `SignalScreen` | Gradient field + centered column + safe areas | Wrap every visitor screen |
| `SignalHeader`, `LocationBlock` | Wordmark between equal 44px slots; room pill + building/floor | Back button only if it navigates. Location is NFC context, static |
| `SignalButton` | `primary` / `outline` / `quiet` | One primary per task section; verb first; charcoal-on-orange label |
| `SuggestionTiles` + `SuggestionTile` | Three quick-issue tiles | Quieter than primary; grow with text; list layout if cramped |
| `Composer` | Mic + text capsule | Text always available; capture only on tap; must have a send action |
| `ChatBubble` | `assistant` (glass, left) / `user` (taupe, right) | ≤85% width; no chain-of-thought or raw tool output |
| `StatusCard`, `StatusRow`, `StatusMark`, `StatusChip` | Progress rows and state chip | success only when verified; icon + label always |
| `EscalationCard` | Inline "Call maintenance?" approval | Not a modal; swaps to in-flight state after approval; blocks repeat taps |
| `ConfirmationCard`, `Timeline`, `TicketStrip` | Confirmed-escalation screen | ETA only from a confirmed source; steps reflect separate evidence |
| `Glyph` | Icon seam | **Placeholder** — swap for the one chosen outline icon family |

### States (buttons)

| State | Rule |
| --- | --- |
| Default | Orange fill, legible charcoal label |
| Pressed | `accentPressed`, scale `.985` |
| Loading | Same width, label changes to e.g. "Requesting call…", `busy` set, repeat taps blocked |
| Disabled | 50% opacity; explain unmet requirement nearby |
| Error | Message beneath the action, keep context, offer retry |

### Composer states

| State | Copy | Control |
| --- | --- | --- |
| idle | "Tell me what’s wrong" | Start recording |
| recording | "Listening…" + elapsed | Stop recording |
| processing | "Preparing your message…" | Busy |
| blocked | "Microphone unavailable. You can type instead." | Text input stays |
| ready | Editable transcript | Send |

## 7. Screen recipes

- **Welcome:** `SignalHeader` → `LocationBlock` → flexible avatar slot → title → supporting line → 3 tiles → `Composer`.
- **Troubleshooting:** header → location → assistant bubble → user bubble → `StatusCard` → `EscalationCard`. Scrollable;
  don't pin a large composer over the approval card.
- **Confirmed:** header → location → avatar slot → title → `StatusChip` + `ConfirmationCard` → `TicketStrip`.
- Use normal flow with flexible spacing, never a fixed phone height. Account for the keyboard with sticky composers.
- The avatar uses the already-selected open-source component; reserve adaptable space, don't style it here.

## 8. Motion

Press 120–160ms (scale + fill). Card reveal 200–240ms (fade + ≤6px rise). Status crossfade 160–200ms. Screen
transition 220–280ms. Easing `cubic-bezier(.2,.8,.2,1)` (`motion.easing`). No bounces, pulsing primaries, animated blur,
or celebratory loops. Respect reduce-motion (`AccessibilityInfo.isReduceMotionEnabled`); animation helpers should use
`react-native-reanimated` (already installed). Don't animate an idle waveform as if audio were being captured.

## 9. Accessibility

- Contrast ≥ 4.5:1 body, 3:1 large text/non-text; check against the composited background.
- Preferred pairs: charcoal on orange, `accentInk` on pale glass, `successInk` for confirmation text.
- Native `Pressable` with `accessibilityRole`/`accessibilityLabel`; busy/disabled via `accessibilityState`.
- Announce dynamic status through a single polite live region; never make the whole conversation or a ticking timestamp
  assertive.
- Voice is optional; typed input must complete the same task.
- Icons and words together for success, warning, failure and pending.

## 10. Fidelity checklist

- [ ] Warm ivory/gray base, no pure white or blue wash
- [ ] Charcoal headings, moderate weight, slightly tight tracking
- [ ] White hairline + shallow shadow on glass; no nested blur
- [ ] Orange only on action surfaces and small attention accents
- [ ] Capsule buttons, ~24px card corners
- [ ] Room/location always visible
- [ ] One dominant action per stage
- [ ] One icon family, shared size/stroke
- [ ] Sparse; no dashboard metrics or agent traces
- [ ] Green/success language only after confirmation
- [ ] No fake phone hardware

## 11. Preview

Mount the living reference on a dev route:

```tsx
// src/app/styleguide.tsx
export { default } from '@/design/showcase';
```

Known gaps (by design, pending choices): icon family, real blur, the avatar component, and enter/exit animations.
