# 10 — NFC setup: NTAG 424 DNA → `/t` → verified Pip chat

Hands-on companion to `docs/03_NFC_SECURITY.md`. Server pieces are already in the repo; this page is what you do with the physical chip.

## What exists in the repo

| Piece | File | Purpose |
|---|---|---|
| SUN/SDM verifier | `src/lib/nfc/ntag424.ts` | AES-CMAC + PICC decrypt, tested against NXP's AN12196 vector |
| Config / keys | `src/lib/nfc/config.ts` | `NFC_MODE`, `NFC_SDM_*_KEY`, `NFC_TAGS` |
| Anti-replay | `src/lib/nfc/replay.ts` | Strictly-increasing counter. **In-memory until SurrealDB Core lands** (see limits) |
| Session token | `src/lib/nfc/session.ts` | HMAC, 30 min, location-scoped; `readSession()` for `/api/chat` |
| Redeem | `POST /api/tap/redeem` | The only route that consumes a scan |
| Inspect | `GET /api/nfc/inspect?e=&c=` | Operator-only (`x-demo-secret`), decodes a tap **without** consuming it |
| Client hook | `src/lib/nfc/client.ts` | `useTapRedeem()` for `src/app/t.tsx` |
| CLI check | `npm run nfc:check -- "<url>"` | Verify a chip URL on your laptop before any deploy |
| Tests | `npm run test:nfc` | RFC 4493 CMAC vectors + NXP SUN vector + tamper/zero/junk cases |

`GET /t` never consumes a scan (prefetch-safe). Redemption is an explicit POST from the Continue button.

## 1. What a working chip sends

```
https://<your-domain>/t?e=40565DABD135600B901EF0CD697D66D1&c=C419638D2DF9291C
```

- `e` = 32 hex: UID + read counter, AES-encrypted (key 00)
- `c` = 16 hex: CMAC signature (key 00)
- **Both change on every read.** Zeros mean SDM is OFF.

The parser also accepts `picc_data`/`cmac` and `enc`/`cmac`, and ignores TagWriter's trailing `?uid=000…` leftover.
Plain `uid=UIDxCOUNTERxCMAC` mirroring is **not** supported; use encrypted `e`/`c`.

## 2. Write the chip (Android, NXP TagWriter)

1. **Write tags → New dataset → Link**
2. URI type **Custom URL**, paste exactly (32 zeros, then 16 zeros) using your real domain:
   ```
   https://<your-domain>/t?e=00000000000000000000000000000000&c=0000000000000000
   ```
   The NFC URL must be the final HTTPS host. Deploy first (roadmap A2) or you will rewrite chips later. For bring-up the host does not matter: step 3 reads `e`/`c` only.
3. **Configure mirroring → Card type: NTAG 424 DNA**, then set:

   | Option | Value |
   |---|---|
   | Enable SDM Mirroring | ✅ |
   | SDM Meta Read Access Right | **00** (never 0F) |
   | Enable UID Mirroring | ✅ |
   | Enable Counter Mirroring | ✅ |
   | SDM Counter Retrieval Key | 00 |
   | Enable Read Counter Limit | ❌ |
   | Derivation Key for CMAC Calculation | **00** (never 0F) |
   | Encrypted File Data Mirroring | ❌ |

4. Offsets: put the cursor **right after the `=`** (before the first zero) and press:

   | Cursor after | Button | Expected |
   |---|---|---|
   | `e=` | Set PICC Data Offset | a number that depends on your domain length; only the cursor position matters |
   | `c=` | Set Offset (SDM MAC Input Offset) | identical to the MAC Offset below |
   | `c=` | Set Offset (SDM MAC Offset) | identical to the MAC Input Offset above |

   MAC Input and MAC offsets are equal **on purpose**: the verifier assumes an empty MAC input (`verifySun(fields, keys, '')`). If you ever change that, pass the exact ASCII span as `macInput`.
5. **OK → Save dataset** ("SIGNAL Tap") → write → hold the chip. If asked for a key: `00000000000000000000000000000000`.
6. Do **not** change keys and do **not** lock the chip yet. Next chips: My datasets → SIGNAL Tap → Write.

## 3. Check a chip before the demo

1. TagWriter → **Read tags** → hold the chip → copy the URL. Read it twice: `e` and `c` must change.
2. On your laptop:
   ```bash
   npm run nfc:check -- "https://<your-domain>/t?e=XXXX&c=YYYY"
   ```
   - `ok: true` + `uid` + `counter` → good chip. Note the UID.
   - `not_configured` → SDM off (zeros). Redo step 2.3–2.4.
   - `bad_picc` → Meta Read key wrong (use 00, not 0F).
   - `bad_mac` → CMAC key (00, not 0F) or the two MAC offsets are off.
3. Link the chip to Room 204 by adding its UID to `NFC_TAGS` (`.env.local` and Vercel):
   ```
   NFC_TAGS=04DE5F1EACC040=room204
   ```
4. Turn verification on: `NFC_MODE=verified`, `APP_SESSION_SECRET=<32+ random chars>`.

Without `NFC_MODE=verified` the app stays in **DEMO / NFC simulation** and `redeem` skips crypto entirely.

## 4. Wire `src/app/t.tsx` (the other session owns this file; this is the whole change)

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTapRedeem } from '@/lib/nfc/client';

const params = useLocalSearchParams();
const { state, redeem } = useTapRedeem(params);

// Continue button:
onPress={async () => {
  const r = await redeem();
  if (r?.status === 'verified' || r?.status === 'simulated') {
    router.replace({ pathname: '/s/[session]', params: { session: r.sessionToken ?? 'demo' } }); // replace strips e/c from history
  }
}}
```

Render from `state`:

| `result.status` | Badge | Copy |
|---|---|---|
| `verified` | "Secure NFC scan checked" | `result.message` (never says "present" or "identified") |
| `simulated` | "DEMO / NFC simulation" | `result.message` |
| `replayed` | warn | "This tap was already used. Tap the chip again." |
| `invalid` / `unconfigured` | "Unverified scan" | still allow non-privileged help |
| `unlinked` | warn | chip valid but not assigned to a room |
| `rate_limited` / `error` | error | retry |

`/api/chat` should call `readSession(token)` and trust `loc` from it, not a client-sent `locationId`.

## 5. Errors seen in the field

| What you see | Cause | Fix |
|---|---|---|
| `nfc:check` → `not_configured` | Wrote the plain URL only (TagWriter CSV cannot enable SDM) | Configure SDM in the app (section 2) |
| URL ends with `?uid=00000000000000x000000x…` | Mirroring on but keys left at **0F** | Meta Read **00**, CMAC key **00** |
| Real `e`/`c` but `bad_mac` | Offsets don't match the cursor positions | Re-place cursors right after `e=` / `c=`, reset the three offsets |
| `replayed` on a fresh tap | Browser or scanner opened the link first and the page redeemed, or two instances | Redeem only from the Continue press; tap again |
| `unlinked` | UID not in `NFC_TAGS` | Add it (section 3.3) |
| Page 404 on `/t` | Not deployed | Deploy first |

## 6. Honest limits (keep these in the pitch)

- A valid SUN read proves the chip produced it, not who scanned it, where they were, or when. The counter is not a clock.
- **Replay protection is per server instance** (`MemoryReplayStore`). On Vercel a cold start forgets counters and another warm instance can accept a replayed URL. `redeem` reports `replayProtection: "memory-best-effort"` so the UI can say so. Fix: SurrealDB Core compare-and-swap behind `ReplayStore` (roadmap B).
- **Factory keys (all zeros) are forgeable** by anyone who knows them. `factoryKeys: true` is returned until `NFC_SDM_META_KEY`/`NFC_SDM_FILE_KEY` are set. Changing chip keys means writing new keys to the tag (TagWriter "change key"), then setting the same 32-hex values in Vercel. Do this only after the factory-key flow works end to end, and keep a recovery plan before locking.
- Per-tag diversified keys and a real key store (`NFC_KEY_STORE_REF`) are not implemented; one shared meta/file key pair is used for all chips.
