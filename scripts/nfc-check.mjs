// Check a chip URL locally before going live:
//   npm run nfc:check -- "https://your-domain/t?e=...&c=..."
// Reads NFC_SDM_META_KEY / NFC_SDM_FILE_KEY from .env.local (factory zeros if unset). Consumes nothing.
import { FACTORY_KEY, extractSunFields, parseKey, verifySun } from '../src/lib/nfc/ntag424.ts';

const url = process.argv[2];
if (!url) {
  console.error('usage: npm run nfc:check -- "<tap url or ?e=..&c=..>"');
  process.exit(2);
}
const meta = process.env.NFC_SDM_META_KEY?.trim();
const file = process.env.NFC_SDM_FILE_KEY?.trim();
const keys = { meta: meta ? parseKey(meta) : FACTORY_KEY, file: file ? parseKey(file) : FACTORY_KEY };

const fields = extractSunFields(url);
const result = fields ? verifySun(fields, keys) : { ok: false, reason: 'malformed' };
console.log(JSON.stringify({ usingFactoryKeys: !meta || !file, ...result }, null, 2));
if (!result.ok) {
  const hint = {
    malformed: 'No e=<32 hex>&c=<16 hex> found in the URL.',
    not_configured: 'All zeros: SDM mirroring is OFF. Redo section 4 of docs/10_NFC_SETUP.md.',
    bad_picc: 'Decrypted but not a UID+counter block: Meta Read key is wrong (use 00, not 0F).',
    bad_mac: 'Wrong CMAC key (use 00, not 0F) or the MAC offsets/input are off.',
  }[result.reason];
  console.error(`FAIL: ${hint}`);
  process.exit(1);
}
