import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { app } from '@/lib/firebase';

/**
 * Client side of server-validated purchases.
 *
 * The `validatePurchase` Cloud Function (functions/src/index.ts) is the ONLY
 * writer of users/{uid}.removeAds — Firestore rules reject client writes to
 * those fields. The client's job is just to hand the function the StoreKit 2
 * signed transaction (JWS, expo-iap's `purchaseToken` on iOS); the function
 * verifies Apple's signature and marks the CALLING account's user doc.
 */

// Lazy init so importing this module has no side effects (matters for tests
// and for binaries where the purchase flow never runs).
let functionsInstance: Functions | null = null;

const getFunctionsInstance = (): Functions => {
  if (!functionsInstance) {
    // Region must match the function's `region` option.
    functionsInstance = getFunctions(app, 'us-central1');
  }
  return functionsInstance;
};

/**
 * Ask the server to validate a signed transaction and grant removeAds on the
 * signed-in account's cloud doc. Returns true on success, false on any
 * failure (never throws): the LOCAL entitlement is already granted by the
 * time this runs, and the claim-on-sign-in retry in PurchaseContext
 * self-heals a missed call, so callers treat this as best-effort.
 */
export const validatePurchaseCloud = async (jws: string): Promise<boolean> => {
  try {
    const callable = httpsCallable(getFunctionsInstance(), 'validatePurchase');
    await callable({ jws });
    return true;
  } catch (e: any) {
    // FirebaseError codes look like 'functions/permission-denied' (forged or
    // refunded receipt), 'functions/unauthenticated', 'functions/internal',
    // or 'functions/unavailable' (offline / function not deployed yet).
    console.log('[purchaseValidation] validatePurchase failed', e?.code ?? e);
    return false;
  }
};
