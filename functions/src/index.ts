import { onCall, HttpsError } from 'firebase-functions/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { VerificationException } from '@apple/app-store-server-library';
import { Resend } from 'resend';
import { verifyTransaction } from './verifiers';

initializeApp();

/**
 * Resend API key. Set once with:
 *   firebase functions:secrets:set RESEND_API_KEY
 * (paste the key from https://resend.com/api-keys). Bound into
 * sendContactMessage below via the `secrets` option so it's injected as an
 * env var at runtime — never committed to source.
 */
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

/**
 * Where Contact Us messages are delivered. This must be the email address on
 * the Resend account until a sending domain is verified: on the free tier /
 * unverified domain Resend only allows sending TO your own account address —
 * which is exactly what we want here.
 *
 * This is the address the Resend account is attached to.
 */
const CONTACT_RECIPIENT_EMAIL = 'connort@gmail.com';

/**
 * From address for Contact Us mail. connortyrrell.com is verified in Resend
 * (DKIM at resend._domainkey, SPF/MX on the send. subdomain — root mail
 * untouched), so we send from the real domain. No mailbox exists at this
 * address and none is needed: replies go to the app user via replyTo, and
 * delivery lands at CONTACT_RECIPIENT_EMAIL.
 */
const CONTACT_FROM = 'Mölkky Contact <contact@connortyrrell.com>';

const MAX_MESSAGE_LENGTH = 5000;
// Deliberately permissive: reject only what obviously isn't an address. Real
// validation is "does Resend accept it / does the reply bounce".
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

/**
 * sendContactMessage — deliver an in-app "Contact Us" message to the app owner
 * by email (via Resend).
 *
 * Auth is OPTIONAL: guests can reach support too (they must supply their own
 * email). When the caller IS signed in we take their verified email from the
 * auth token and IGNORE any client-supplied address, so a signed-in user can't
 * spoof someone else's return address. Guests supply { email } which we only
 * shape-check — the real proof is whether a reply bounces.
 *
 * The sender's address becomes the email's reply-to, so replying from your
 * inbox goes straight back to the user.
 */
export const sendContactMessage = onCall(
  { region: 'us-central1', secrets: [RESEND_API_KEY] },
  async (request) => {
    const rawMessage = request.data?.message;
    if (typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'A message is required.');
    }
    const message = rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH);

    // Signed-in: trust the token email (fall back to client-supplied only if
    // the provider didn't populate one, e.g. some federated tokens). Guests:
    // require a well-formed client-supplied address.
    const tokenEmail =
      typeof request.auth?.token.email === 'string' ? request.auth.token.email : '';
    const clientEmail =
      typeof request.data?.email === 'string' ? request.data.email.trim() : '';
    const replyEmail = tokenEmail || clientEmail;

    if (!replyEmail || !EMAIL_RE.test(replyEmail)) {
      throw new HttpsError(
        'invalid-argument',
        'A valid email address is required so we can reply.',
      );
    }

    const uid = request.auth?.uid ?? null;
    const authState = uid ? `signed in (uid: ${uid})` : 'guest (not signed in)';

    const text = [
      `New Mölkky contact message`,
      ``,
      `From: ${replyEmail}`,
      `Account: ${authState}`,
      ``,
      `Message:`,
      message,
    ].join('\n');

    const resend = new Resend(RESEND_API_KEY.value());
    const { data, error } = await resend.emails.send({
      from: CONTACT_FROM,
      to: [CONTACT_RECIPIENT_EMAIL],
      replyTo: replyEmail,
      subject: `Mölkky Contact — ${replyEmail}`,
      text,
    });

    if (error) {
      console.error('[sendContactMessage] Resend error', error);
      throw new HttpsError('internal', 'Could not send your message. Please try again.');
    }

    return { ok: true, id: data?.id ?? null };
  },
);
