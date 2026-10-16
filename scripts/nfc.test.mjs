// Run: npm run test:nfc  (Node >= 22.18 strips TypeScript types natively; no extra deps)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { FACTORY_KEY, aesCmac, extractSunFields, verifySun } from '../src/lib/nfc/ntag424.ts';

const keys = { meta: FACTORY_KEY, file: FACTORY_KEY };

test('AES-CMAC matches RFC 4493 vectors', () => {
  const key = Buffer.from('2b7e151628aed2a6abf7158809cf4f3c', 'hex');
  assert.equal(aesCmac(key, Buffer.alloc(0)).toString('hex'), 'bb1d6929e95937287fa37d129b756746');
  assert.equal(
    aesCmac(key, Buffer.from('6bc1bee22e409f96e93d7e117393172a', 'hex')).toString('hex'),
    '070a16b46b4d4144f79bdd9dd04a287c',
  );
});

test('NXP AN12196 SUN vector (factory keys) -> UID 04DE5F1EACC040, counter 61', () => {
  const fields = extractSunFields('https://x.test/t?e=EF963FF7828658A599F3041510671E88&c=94EED9EE65337086');
  assert.ok(fields);
  assert.deepEqual(verifySun(fields, keys), { ok: true, uid: '04DE5F1EACC040', counter: 61 });
});

test('legacy picc_data / cmac names and TagWriter leftover template are accepted', () => {
  const url =
    '?picc_data=EF963FF7828658A599F3041510671E88&cmac=94EED9EE65337086%3Fuid%3D00000000000000x000000x0000000000000000';
  const fields = extractSunFields(url);
  assert.ok(fields);
  assert.equal(verifySun(fields, keys).ok, true);
});

test('tampered MAC is rejected', () => {
  const result = verifySun({ e: 'EF963FF7828658A599F3041510671E88', c: '94EED9EE65337087' }, keys);
  assert.deepEqual(result, { ok: false, reason: 'bad_mac' });
});

test('wrong meta key is rejected as bad_picc (or bad_mac)', () => {
  const wrong = { meta: Buffer.alloc(16, 1), file: FACTORY_KEY };
  const result = verifySun({ e: 'EF963FF7828658A599F3041510671E88', c: '94EED9EE65337086' }, wrong);
  assert.equal(result.ok, false);
});

test('SDM-off placeholders report not_configured; junk is malformed', () => {
  assert.deepEqual(verifySun({ e: '0'.repeat(32), c: '0'.repeat(16) }, keys), { ok: false, reason: 'not_configured' });
  assert.equal(extractSunFields('https://x.test/t?e=zz&c=yy'), null);
  assert.equal(extractSunFields('https://x.test/t'), null);
});
