// NTAG 424 DNA SUN/SDM verification (NXP AN12196, AES mode, not LRP). Server-only: node:crypto, no other imports.
//
// The tag mirrors two fields into its NDEF URL on every read:
//   e = 32 hex = AES-128-CBC(metaKey, IV=0, [tag byte | UID(7) | counter(3, LSB first) | random pad])
//   c = 16 hex = AES-CMAC truncated to its odd-indexed bytes (1,3,5,..15), under a per-read session key
// This file is pure and keyless-by-argument so it can be checked against the published NXP test vector
// (see scripts/nfc.test.mjs). It does NOT decide replay or tag->location mapping; see replay.ts / registry.ts.

/// <reference types="node" />
import { createCipheriv, createDecipheriv, timingSafeEqual } from 'node:crypto';

export type SunFailure = 'malformed' | 'not_configured' | 'bad_picc' | 'bad_mac';
export type SunResult =
  | { ok: true; uid: string; counter: number }
  | { ok: false; reason: SunFailure };

export type SunKeys = {
  /** SDM Meta Read key (decrypts `e`). TagWriter key number 00 by default. */
  meta: Buffer;
  /** SDM File Read key (MAC session key source). TagWriter "Derivation Key for CMAC" 00 by default. */
  file: Buffer;
};

export type SunFields = { e: string; c: string };

const HEX = /^[0-9a-f]+$/i;
const ZERO_16 = Buffer.alloc(16);

export const FACTORY_KEY = Buffer.alloc(16);

export function parseKey(hex: string): Buffer {
  if (!/^[0-9a-f]{32}$/i.test(hex)) throw new Error('AES-128 key must be 32 hex characters');
  return Buffer.from(hex, 'hex');
}

/**
 * Pulls the SDM fields out of a full URL, a bare query string or a mangled leftover.
 * Accepts e/c, picc_data/cmac and enc/cmac. Ignores TagWriter's trailing empty `?uid=000...` template.
 */
export function extractSunFields(input: string): SunFields | null {
  if (input.length > 2048) return null;
  let raw = input;
  try {
    raw = decodeURIComponent(input);
  } catch {
    // keep raw
  }
  const e = /[?&#](?:e|picc_data|enc)=([0-9a-f]{32})(?![0-9a-f])/i.exec(raw)?.[1];
  const c = /[?&#](?:c|cmac)=([0-9a-f]{16})(?![0-9a-f])/i.exec(raw)?.[1];
  return e && c ? { e, c } : null;
}

function aesEcbEncrypt(key: Buffer, block: Buffer): Buffer {
  const cipher = createCipheriv('aes-128-ecb', key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(block), cipher.final()]);
}

function xor(a: Buffer, b: Buffer): Buffer {
  const out = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i]! ^ b[i]!;
  return out;
}

function shiftLeft(buf: Buffer): Buffer {
  const out = Buffer.alloc(buf.length);
  let carry = 0;
  for (let i = buf.length - 1; i >= 0; i--) {
    out[i] = ((buf[i]! << 1) | carry) & 0xff;
    carry = buf[i]! & 0x80 ? 1 : 0;
  }
  return out;
}

function cmacSubkeys(key: Buffer): [Buffer, Buffer] {
  const l = aesEcbEncrypt(key, ZERO_16);
  const k1 = shiftLeft(l);
  if (l[0]! & 0x80) k1[15]! ^= 0x87;
  const k2 = shiftLeft(k1);
  if (k1[0]! & 0x80) k2[15]! ^= 0x87;
  return [k1, k2];
}

/** AES-128 CMAC, RFC 4493. */
export function aesCmac(key: Buffer, message: Buffer): Buffer {
  const [k1, k2] = cmacSubkeys(key);
  const blocks = Math.max(1, Math.ceil(message.length / 16));
  const complete = message.length > 0 && message.length % 16 === 0;
  const last = Buffer.alloc(16);
  const lastStart = (blocks - 1) * 16;
  const tail = message.subarray(lastStart);
  if (complete) {
    xor(tail, k1).copy(last);
  } else {
    tail.copy(last);
    last[tail.length] = 0x80;
    xor(last, k2).copy(last);
  }
  let x: Buffer = Buffer.alloc(16);
  for (let i = 0; i < blocks - 1; i++) {
    x = aesEcbEncrypt(key, xor(x, message.subarray(i * 16, i * 16 + 16)));
  }
  return aesEcbEncrypt(key, xor(x, last));
}

/** SDM truncates the CMAC to the odd-indexed bytes (1,3,5,...,15). */
function truncateMac(full: Buffer): Buffer {
  const out = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) out[i] = full[2 * i + 1]!;
  return out;
}

/**
 * Verifies one tap. `macInput` is the ASCII between the tag's "SDM MAC Input Offset" and "SDM MAC Offset";
 * empty when both offsets are equal (the setup in docs/10_NFC_SETUP.md).
 */
export function verifySun(fields: SunFields, keys: SunKeys, macInput = ''): SunResult {
  if (!HEX.test(fields.e) || fields.e.length !== 32 || !HEX.test(fields.c) || fields.c.length !== 16) {
    return { ok: false, reason: 'malformed' };
  }
  // SDM not active: the tag still holds the placeholder zeros TagWriter wrote.
  if (/^0+$/.test(fields.e) && /^0+$/.test(fields.c)) return { ok: false, reason: 'not_configured' };

  const decipher = createDecipheriv('aes-128-cbc', keys.meta, ZERO_16);
  decipher.setAutoPadding(false);
  const picc = Buffer.concat([decipher.update(Buffer.from(fields.e, 'hex')), decipher.final()]);

  const tagByte = picc[0]!;
  const uidMirrored = (tagByte & 0x80) !== 0;
  const counterMirrored = (tagByte & 0x40) !== 0;
  const uidLength = tagByte & 0x0f;
  if (!uidMirrored || !counterMirrored || uidLength !== 7) return { ok: false, reason: 'bad_picc' };

  const uid = picc.subarray(1, 8);
  const counterLsb = picc.subarray(8, 11);

  // SV2 = 3CC3 0001 0080 || UID || SDMReadCtr (LSB first), zero padded to one block.
  const sv2 = Buffer.alloc(16);
  Buffer.from([0x3c, 0xc3, 0x00, 0x01, 0x00, 0x80]).copy(sv2);
  uid.copy(sv2, 6);
  counterLsb.copy(sv2, 13);
  const sessionKey = aesCmac(keys.file, sv2);

  const expected = truncateMac(aesCmac(sessionKey, Buffer.from(macInput, 'ascii')));
  const given = Buffer.from(fields.c, 'hex');
  if (!timingSafeEqual(expected, given)) return { ok: false, reason: 'bad_mac' };

  return {
    ok: true,
    uid: uid.toString('hex').toUpperCase(),
    counter: counterLsb[0]! | (counterLsb[1]! << 8) | (counterLsb[2]! << 16),
  };
}
