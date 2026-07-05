import * as fs from 'fs';
import * as path from 'path';
import {
  Environment,
  SignedDataVerifier,
  VerificationException,
  VerificationStatus,
  type JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library';

/**
 * App Store signed-transaction (JWS) verification.
 *
 * Verification is fully offline-capable: the client sends the signed JWS it
 * got from StoreKit 2 (expo-iap exposes it as `purchaseToken` on iOS), and
 * @apple/app-store-server-library checks the certificate chain against
 * Apple's pinned root certificates (functions/certs/) and decodes the
 * payload. No App Store Connect API key is needed for this path.
 */

export const BUNDLE_ID = 'com.connortyrrell.molkky';

/**
 * TODO(owner): REQUIRED BEFORE PRODUCTION. Fill in the app's numeric Apple ID
 * from App Store Connect → (the app) → App Information → "Apple ID" (a number
 * like 6448311069). The PRODUCTION verifier cannot be constructed without it,
 * so with this left at 0 production-signed transactions WILL FAIL
 * verification — only SANDBOX purchases validate (the sandbox verifier takes
 * no appAppleId and works immediately, which is what makes TestFlight /
 * StoreKit sandbox testing possible before this is filled in).
 */
const APP_APPLE_ID = 1632775168;

// Apple root certificates, bundled with the deployed function. __dirname is
// functions/lib at runtime (tsc outDir), so '..' lands on functions/ and
// certs/ resolves to functions/certs.
const CERTS_DIR = path.join(__dirname, '..', 'certs');
const CERT_FILES = [
  'AppleRootCA-G3.cer',
  'AppleRootCA-G2.cer',
  'AppleIncRootCertificate.cer',
];

const loadAppleRootCerts = (): Buffer[] =>
  CERT_FILES.map((name) => fs.readFileSync(path.join(CERTS_DIR, name)));

// Lazily constructed so a cert-loading problem surfaces per-request (as a
// function error) instead of crashing the whole instance at module load.
let productionVerifier: SignedDataVerifier | null | undefined;
let sandboxVerifier: SignedDataVerifier | undefined;

const getProductionVerifier = (): SignedDataVerifier | null => {
  if (productionVerifier === undefined) {
    // Guard: the production verifier REQUIRES the numeric Apple app ID; with
    // the TODO above unfilled we skip it entirely and verify sandbox-only.
    productionVerifier =
      APP_APPLE_ID > 0
        ? new SignedDataVerifier(
            loadAppleRootCerts(),
            true, // enableOnlineChecks (OCSP revocation checking)
            Environment.PRODUCTION,
            BUNDLE_ID,
            APP_APPLE_ID,
          )
        : null;
  }
  return productionVerifier;
};

const getSandboxVerifier = (): SignedDataVerifier => {
  if (sandboxVerifier === undefined) {
    // Sandbox verification does not use appAppleId (sandbox-signed payloads
    // don't carry one), so this works before APP_APPLE_ID is filled in.
    sandboxVerifier = new SignedDataVerifier(
      loadAppleRootCerts(),
      true,
      Environment.SANDBOX,
      BUNDLE_ID,
    );
  }
  return sandboxVerifier;
};

/**
 * Verify a StoreKit 2 signed transaction (JWS) and return its decoded
 * payload. Tries PRODUCTION first (when configured — see APP_APPLE_ID),
 * falling back to SANDBOX only on INVALID_ENVIRONMENT, which is how Apple
 * says to support sandbox/TestFlight receipts hitting a production server.
 * Throws VerificationException when the payload fails both.
 */
export const verifyTransaction = async (
  jws: string,
): Promise<JWSTransactionDecodedPayload> => {
  const prod = getProductionVerifier();
  if (prod) {
    try {
      return await prod.verifyAndDecodeTransaction(jws);
    } catch (e) {
      if (
        e instanceof VerificationException &&
        e.status === VerificationStatus.INVALID_ENVIRONMENT
      ) {
        // Sandbox-signed payload — fall through to the sandbox verifier.
      } else {
        throw e;
      }
    }
  }
  return getSandboxVerifier().verifyAndDecodeTransaction(jws);
};
