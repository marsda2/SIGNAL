/**
 * SECURITY PSEUDOCODE ONLY; intentionally omits the cryptographic implementation.
 * Use NXP AN12196, configured tag SDM offsets and vetted AES/CMAC verification.
 * A URL read counter is not a timestamp or proof of visitor identity.
 */
export async function redeemScan(request: unknown) {
  const fields = parseAndBoundEncodedSDMFields(request);  // no unbounded payloads
  const tag = await findEnabledTagFromProtectedIdentifier(fields);
  if (!tag) throw new Error('invalid_tag');

  // MUST validate the exact SUN/SDM message according to the card's profile.
  const authenticated = await verifyConfiguredNXPSDM({
    fields, profile: tag.sdmProfile, keyReference: tag.keyReference,
  });
  if (!authenticated) throw new Error('bad_authentication');

  // MUST run atomically in the authoritative operations database.
  const consumed = await transactionalConsumeRead({
    tagId: tag.id,
    readCounter: authenticated.readCounter,
    payloadHash: authenticated.claimHash,
    onlyIfHigherThanLastAccepted: true,
  });
  if (!consumed) throw new Error('replayed_or_out_of_order_read');

  return createShortLivedVisitorSession({
    locationId: tag.locationId,
    verifiedNfc: true,
    allowedCapabilities: ['ask', 'request_report'],
  });
}

// Signature stubs intentionally have no body. Replace with production-tested modules.
declare function parseAndBoundEncodedSDMFields(v: unknown): unknown;
declare function findEnabledTagFromProtectedIdentifier(v: unknown): Promise<any>;
declare function verifyConfiguredNXPSDM(v: unknown): Promise<any>;
declare function transactionalConsumeRead(v: unknown): Promise<boolean>;
declare function createShortLivedVisitorSession(v: unknown): any;
