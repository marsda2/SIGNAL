# SIGNAL UI style guide

Implementation-facing guide for this Expo app, matched to the **SIGNAL Brand & UI concept board** (warm ivory,
white cards, signal-orange actions, green only for verified outcomes). Tokens live in
[`src/design/tokens.ts`](../src/design/tokens.ts); components in [`src/design/`](../src/design/). The living
component sheet is `/styleguide` (`src/design/showcase.tsx`), laid out like the board: 01 brand · 02 components ·
03 chat & guidance · 04 status & escalation · 05 Pip states.

> **Legacy bridge:** `src/constants/tokens.ts` (`colors`, `radius`) and `src/components/ui.tsx` (`Card`, `Button`,
> `Badge`, `text`) derive from the design tokens, so operator screens (`/admin`, `/admin/spaces`, `/demo/maintenance`)
> restyle automatically. New visitor work should import from `@/design`.

## 1. Character

Calm, contextual, capable, transparent, approachable. Warm ivory field, near-white cards with soft shadows, charcoal
type, orange only for action and attention. Sparse screens, one clear next step, the room always visible.

- Sentence case; brand name always **SIGNAL** (wordmark: tracked uppercase + the orange five-bar mark).
- No provider/model names, agent logs, or reasoning in visitor UI.
- **Truthful state:** "checking → requesting → confirmed" are separate states. Only show "Help is on the way." or an
  ETA once maintenance actually confirmed it; otherwise "Arrival time pending". Never render a pending request as success.
- Copy lives in `copy` (tokens.ts) or next to the screen. Restyling never changes wording.

## 2. Color

| Token | Value | Use |
| --- | --- | --- |
| `canvas` / `canvasLight` / `canvasShade` | `#F4EFE9` / `#F9F6F1` / `#E6DFD7` | "Warm ivory" page field (never text) |
| `surfaceSolid` / `surfaceGlassStrong` / `surfaceGlass` | `#FFFCF8` / `rgba(255,253,250,.96/.84)` | Cards, tiles, bubbles, composer |
| `surfaceSunken` | `#EFE9E2` | "Frosted surfaces": icon wells, number badges, disabled send |
| `surfaceUser` | `#FCDDCB` | Visitor chat bubble (soft peach) |
| `text` / `textSecondary` / `textMuted` / `textDisabled` | `#26221F` / `#5E5852` / `#6E6760` / `#A69E96` | Charcoal hierarchy |
| `accent` / `accentLight` / `accentPressed` | `#F66216` / `#FF7E3B` / `#E25510` | "Signal orange": filled actions, mic/send circle, brand mark |
| `onAccent` | `#FFFFFF` | Label/icon on an orange fill |
| `accentInk` | `#B4420C` | Orange **text**, outline labels, selected-tile label, focus |
| `accentSoft` / `accentLine` | `#FFE7D8` / `#F9C7A8` | Selected tiles, attention callouts, icon wells |
| `success` / `successInk` / `successSoft` / `successLine` | `#3A9444` / `#2A7031` / `#E7F3E3` / `#C9E2C3` | Verified success only |
| `errorInk` / `errorSoft` | `#A33228` / `#FBE6E1` | Failures and notices |

Balance ≈ 80% warm neutrals / 15% charcoal / 5% orange + state. Orange = action, green = verified, red = failed.
**Color alone never carries state** — pair with icon + label. Page background is never pure white or cool-toned.

**Contrast note:** the board puts white labels on orange. `onAccent` white on `accent` is ≈3.1:1 (passes the 3:1
large-text/UI threshold, not 4.5:1 for 16px text). Setting `onAccent` to `#26221F` switches every orange button to
charcoal labels at ≈5:1 without other changes. Small orange text always uses `accentInk` (≥4.5:1 on ivory and peach).

## 3. Typography

System sans only (no bundled font; SF Pro on iOS matches the board). Variants via `<SignalText variant=…>`:

| Variant | Size / line | Weight | Tracking | Use |
| --- | --- | --- | --- | --- |
| `display` | 38 / 42 | 700 | −1.3 | Home headline |
| `title` | 28 / 34 | 700 | −0.8 | Landing / outcome titles |
| `section` | 17 / 23 | 600 | −0.3 | Room name, "Common here", card titles |
| `hero` | 18 / 26 | 400 | −0.25 | Supporting line |
| `body` / input | 16 / 23 | 400 | −0.15 | Bubbles, card body (16 keeps iOS from zooming inputs) |
| `button` | 16 / 20 | 600 | −0.1 | Primary buttons |
| `label` | 14 / 19 | 500 | −0.1 | Tiles, rows, chips |
| `meta` | 12 / 17 | 400 | 0 | Source, time, building line (tabular numerals) |
| `eyebrow` | 11 / 14 | 600 | +2.2, uppercase | "TAP. ASK. RESOLVE.", section rules |
| `wordmark` | 15 / 20 | 500 | +5.4, uppercase | SIGNAL |

Never put essential instructions in `meta`. Let titles wrap. Support 200% text size: controls grow, never clip.

## 4. Layout & geometry

- **Centered single column, max 440–480px**, also on tablet/web. No fake status bars, notches or phone frames.
- Screen padding 16; stack gap 12–16; section gaps 20–24. Spacing scale `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Radii: card 22 · tile/row/strip 18 · bubble 20 (tail corner 6, top-left beside Pip) · icon well 14 · pills 999.
- Targets ≥ 44×44. Primary button ≥ 52 high, composer ≥ 62, tile ≥ 96, status icon 24 inside a ≥ 56 row.

## 5. Surfaces, shadows, icons

- Cards are near-white with a white hairline and a soft, warm, diffuse shadow (`shadows.soft` / `floating`). Orange
  fills get an orange glow (`shadows.primary`). No heavy gray drops, bevels or neumorphic grooves.
- **SSR rule:** this app server-renders web (`web.output: "server"`) and RN-web drops `backgroundImage` during SSR
  (hydration mismatch). Everything uses flat fills; `gradients` stay unused. Don't measure the window during render
  (fixed paddings), and read `router.canGoBack()` in an effect, not during render.
- **Icons:** one outline family on a 24px grid, round caps/joins, ~1.75px stroke at 22px (`Glyph`, paths adapted
  from Lucide, ISC). Web renders inline SVG; native falls back to characters (no `react-native-svg` installed).
  Icons are decorative: the control or row carries the words.

## 6. Components

All exported from `@/design`.

| Component | Board element | Key rules |
| --- | --- | --- |
| `SignalHeader` (+ `HeaderIconButton`, `SignalWordmark`, `SignalMark`) | Back · SIGNAL ||| · more | Back only if it navigates; right slot for one 44px control (e.g. sound toggle) |
| `LocationBlock` | Room card (building well, name, floor · building) | Static; `badge` for NFC state; chevron only if it opens details |
| `SuggestionTiles` + `SuggestionTile` | Equipment tile: default / selected / unavailable | `columns` 2–3; `align="start"` for long questions |
| `ActionRow` | "Something else ›", "Screen · Not working ›" | Icon well + title + detail + chevron/external |
| `ChatBubble` | Pip bubble (white, avatar left) / visitor bubble (peach, right) | ≤85% width; no chain-of-thought or raw tool output |
| `Callout` | "Known issue found", "Try this fix", "Maintenance confirmed" | Tone follows evidence: `success` only when verified |
| `StepList` | Numbered fix steps | Only safe, operator-approved steps |
| `SignalButton` | Filled orange / outline orange / quiet; `size="sm"` | One primary per section; verb first; long labels wrap centered |
| `Composer` | Capsule with one orange circle | Mic circle when voice is wired, otherwise the send circle; text always available |
| `EscalationCard` | "Call maintenance?" with wrench well | Inline, not a modal; in-flight state blocks repeat taps |
| `StatusCard` / `StatusRow` / `StatusMark` / `StatusChip` | Troubleshooting status | Filled green check only when confirmed |
| `ConfirmationCard`, `Timeline`, `TicketStrip` | Confirmed-escalation screen | ETA only from a confirmed source |
| `IconWell`, `Glyph` | Icon containers / icon family | Decorative |

### States (buttons)

| State | Rule |
| --- | --- |
| Default | Orange fill, white label (`onAccent`), soft orange glow |
| Pressed | `accentPressed`, smaller glow, scale `.985` |
| Loading | Same width, label changes (e.g. "Requesting call…"), `busy` set, repeat taps blocked |
| Disabled | 50% opacity; explain the unmet requirement nearby |
| Error | Message beneath the action, keep context, offer retry |

### Composer states

| State | Copy | Control |
| --- | --- | --- |
| idle | "Tell me what’s wrong" (or the screen's hint) | Mic (voice) or disabled send circle |
| recording | "Listening…" + elapsed | Stop |
| processing | "Preparing your message…" | Busy |
| blocked | "Microphone unavailable. You can type instead." | Text input stays |
| ready | Editable text | Orange send circle |

## 7. Screen recipes

- **Chat `/s/[session]`:** `SignalHeader` (sound toggle right) → `LocationBlock` with the NFC badge → list: live Pip +
  greeting bubble → before the first message, "Common here" as a 2-column tile grid; after it, a chip row above the
  composer. Pip messages carry a small `PipAvatar`; cards (memory, seen before, ticket, portal/call attempt, contacts)
  are `Callout`s; approvals are `EscalationCard`s; a "Checking…" row shows while a reply is pending.
- **Landing `/t`:** header → Pip (chip data) or NFC well → card with title, body, scan result → Continue.
- **Home `/`:** wordmark lockup → roaming Pip → eyebrow, display headline, supporting line → primary button.
- Use normal flow with flexible spacing, never a fixed phone height. Account for the keyboard with sticky composers.

## 7b. Pip (mascot)

`src/components/Pip.tsx` owns Pip's look (original renderer, no AGPL code, plain Views + `Animated`). Exports used by
screens: `Pip({ state, size, roam })` — live, animated, always renders its state label — and
`PipAvatar({ size, state })` — static face, no label, for chat message avatars. All loops stop under reduce-motion.
See every state on `/styleguide`.

## 8. Motion

Press 120–160ms (scale + fill). Card reveal 200–240ms. Status crossfade 160–200ms. Easing `cubic-bezier(.2,.8,.2,1)`
(`motion.easing`). No bounces on controls, pulsing primaries, animated blur, or celebratory loops. Respect
reduce-motion. Don't animate an idle waveform as if audio were being captured.

## 9. Accessibility

- Contrast ≥ 4.5:1 body, 3:1 large text/non-text, checked against the composited background (see the contrast note in §2).
- Native `Pressable` with `accessibilityRole`/`accessibilityLabel`; busy/disabled/selected via `accessibilityState`.
- Announce dynamic status through polite live regions; never make the whole conversation assertive.
- Voice is optional; typed input must complete the same task. Captions render for every audio cue.
- Icons and words together for success, warning, failure and pending.

## 10. Fidelity checklist

- [ ] Warm ivory base, near-white cards with soft warm shadows, no pure white page or blue wash
- [ ] Charcoal headings, bold display, slightly tight tracking; tracked uppercase wordmark with the orange bar mark
- [ ] Orange only on action surfaces and small attention accents; peach for selection
- [ ] Capsule buttons, ~22px card corners, 18px tiles
- [ ] Room/location always visible
- [ ] One dominant action per stage
- [ ] One outline icon family, shared size/stroke
- [ ] Green/success language only after confirmation
- [ ] No fake phone hardware
