import { onCall, HttpsError } from 'firebase-functions/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { VerificationException } from '@apple/app-store-server-library';
import { verifyTransaction } from './verifiers';

initializeApp();

/** Must match constants/iap.ts REMOVE_ADS_SKU in the app. */
const REMOVE_ADS_PRODUCT_ID = 'com.connortyrrell.molkky.removeads';

/**
 * validatePurchase — the ONLY writer of users/{uid}.removeAds/removeAdsInfo.
 *
 * The client sends the StoreKit 2 signed transaction (JWS); we verify Apple's
 * signature server-side (see verifiers.ts) and, only if it's a genuine,
 * unrevoked purchase of the remove-ads product, mark the CALLER's user doc.
 * Firestore rules reject client writes to these fields outright (Admin SDK
 * bypasses rules), so a forged client can't grant itself the entitlement.
 */
export const validatePurchase = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to validate a purchase.');
  }
  const jws = request.data?.jws;
  if (typeof jws !== 'string' || jws.length === 0) {
    throw new HttpsError('invalid-argument', 'Expected { jws: string }.');
  }

  let tx;
  try {
    tx = await verifyTransaction(jws);
  } catch (e) {
    if (e instanceof VerificationException) {
      throw new HttpsError(
        'permission-denied',
        `Transaction signature verification failed (status ${e.status}).`,
      );
    }
    console.error('[validatePurchase] unexpected verification error', e);
    throw new HttpsError('internal', 'Could not verify the transaction.');
  }

  if (tx.productId !== REMOVE_ADS_PRODUCT_ID) {
    throw new HttpsError(
      'failed-precondition',
      `Transaction is for a different product (${tx.productId ?? 'unknown'}).`,
    );
  }
  if (tx.revocationDate) {
    throw new HttpsError('failed-precondition', 'Purchase was refunded.');
  }

  const uid = request.auth.uid;
  const userRef = getFirestore().doc(`users/${uid}`);

  // Deliberately NO per-transaction claim registry: one valid Apple purchase
  // may be claimed by multiple Firebase accounts (household / Family Sharing
  // support, and owner comps). If that ever needs tightening, key a `claims`
  // collection by originalTransactionId.
  const entitlementFields = {
    removeAds: true,
    removeAdsInfo: {
      productId: tx.productId,
      transactionId: tx.transactionId ?? null,
      originalTransactionId: tx.originalTransactionId ?? null,
      environment: tx.environment ?? null,
      purchaseDate: tx.purchaseDate ?? null,
      validatedAt: FieldValue.serverTimestamp(),
    },
  };

  // Simple get-then-set, not a transaction: if this races the client's own
  // findOrCreateCloudUser (services/cloudUsers.ts), either order is safe.
  // Client creates first: we see the doc and merge only the entitlement
  // fields. We seed first: the client's create path is a FULL non-merge
  // setDoc that would strip removeAds — but the Firestore rules' diff-guard
  // REJECTS any client write touching removeAds/removeAdsInfo, so that write
  // fails, and findOrCreateCloudUser's shape-repair path (merge:true, base
  // fields only) heals the doc on the next launch.
  const snap = await userRef.get();
  if (snap.exists) {
    // Doc already exists — touch ONLY the entitlement fields.
    await userRef.set(entitlementFields, { merge: true });
  } else {
    // No user doc yet (e.g. purchase claimed before the client's
    // findOrCreateCloudUser ran). Seed the full base shape — matching
    // findOrCreateCloudUser — in the SAME set so we never leave a partial
    // doc holding only removeAds/removeAdsInfo.
    await userRef.set(
      {
        email: request.auth.token.email ?? '',
        name: (request.auth.token.name as string) ?? request.auth.token.email ?? '',
        friends: [],
        createdAt: new Date().toISOString(),
        ...entitlementFields,
      },
      { merge: true },
    );
  }

  return { ok: true, productId: tx.productId, transactionId: tx.transactionId ?? null };
});
