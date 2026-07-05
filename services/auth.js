import { Platform } from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  OAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  linkWithCredential,
  reauthenticateWithCredential,
  revokeAccessToken,
  sendEmailVerification,
  deleteUser as firebaseDeleteUser,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
} from '@/constants/googleSignInConfig';
import { getGoogleSignIn } from '@/lib/googleSignIn';
import { auth } from '@/lib/firebase';

/**
 * Thin wrappers around Firebase Auth.
 *
 * All functions use the shared `auth` instance from `@/lib/firebase` (which is
 * initialized with React Native AsyncStorage persistence) rather than calling
 * `getAuth()`. Calling `getAuth()` before that init runs would hand back an
 * auth with default in-memory persistence, so we always import the instance.
 *
 * Note: We no longer fetch the user's Firestore record here. The AuthContext
 * subscribes to onAuthStateChanged and runs the offline-first backfill
 * (services/backfill.ts) which is responsible for creating the Firestore user
 * doc, merging friends, and pushing local games up. Keeping auth.js dumb
 * means signIn/signUp succeed quickly without waiting on extra Firestore
 * round-trips that might fail offline.
 */

export const signUpNewUser = async (email, password, displayName) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  try {
    await updateProfile(user, { displayName });
  } catch (e) {
    console.log('[auth] updateProfile failed (non-fatal)', e);
  }
  // Send a verification email (best-effort). Verification matters beyond
  // hygiene: Firebase's "one account per email" policy strips UNVERIFIED
  // sign-in methods when a trusted provider (Google/Apple) signs in with the
  // same email. A verified password survives and the provider links alongside
  // it instead.
  try {
    await sendEmailVerification(user);
  } catch (e) {
    console.log('[auth] sendEmailVerification failed (non-fatal)', e);
  }
  return user;
};

/** Re-send the verification email to the signed-in user. */
export const sendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to verify.');
  }
  await sendEmailVerification(user);
};

export const signInUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOutUser = () => signOut(auth);

// ---------------------------------------------------------------------------
// Sign in with Apple
// ---------------------------------------------------------------------------

/** True when the device can present the native Apple sign-in sheet (iOS 13+). */
export const isAppleSignInAvailable = async () => {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
};

/**
 * Run the native Apple sign-in sheet and build a Firebase OAuth credential
 * from the result.
 *
 * Nonce dance (replay protection): Apple receives the SHA-256 HASH of a random
 * nonce and embeds it in the identity token; Firebase receives the RAW nonce
 * and verifies the hash matches. expo-apple-authentication passes `nonce`
 * through to Apple as-is, so we must hash it ourselves.
 *
 * Throws expo's ERR_REQUEST_CANCELED error if the user dismisses the sheet —
 * callers should treat that as a no-op, not an error.
 */
const requestAppleCredential = async () => {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );
  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!appleCredential.identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }
  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce,
  });
  return { firebaseCredential, appleCredential };
};

/**
 * Sign in (or up — Apple makes no distinction) with Apple via Firebase.
 *
 * Apple only provides the user's name on the FIRST authorization for this
 * Apple ID + app; it is never sent again. So when Firebase has no displayName
 * yet and Apple handed us one, persist it to the Firebase profile immediately
 * or it is lost forever.
 */
export const signInWithApple = async () => {
  const { firebaseCredential, appleCredential } = await requestAppleCredential();
  const userCredential = await signInWithCredential(auth, firebaseCredential);
  const user = userCredential.user;
  const { fullName } = appleCredential;
  if (!user.displayName && (fullName?.givenName || fullName?.familyName)) {
    const displayName = [fullName.givenName, fullName.familyName]
      .filter(Boolean)
      .join(' ');
    try {
      await updateProfile(user, { displayName });
    } catch (e) {
      console.log('[auth] updateProfile after Apple sign-in failed (non-fatal)', e);
    }
  }
  return user;
};

/**
 * Link Apple as an ADDITIONAL sign-in method on the signed-in account.
 * Unlike a fresh Apple sign-in (which, per Firebase's one-account-per-email
 * policy, can strip an unverified password), linking never removes existing
 * providers — afterwards the user can sign in with either method.
 */
export const linkAppleToCurrentUser = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to link.');
  }
  const { firebaseCredential } = await requestAppleCredential();
  await linkWithCredential(user, firebaseCredential);
};

/**
 * Re-authenticate the current user with a fresh Apple credential (Firebase
 * requires a recent login before account deletion). Returns the Apple
 * authorizationCode so the caller can revoke the Apple token — an App Store
 * requirement when deleting an account that used Sign in with Apple.
 */
export const reauthenticateWithApple = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to reauthenticate.');
  }
  const { firebaseCredential, appleCredential } = await requestAppleCredential();
  await reauthenticateWithCredential(user, firebaseCredential);
  return appleCredential.authorizationCode;
};

/**
 * Run the Apple sign-in sheet purely to obtain a fresh authorizationCode —
 * NO Firebase reauthentication happens. Used on account deletion when the
 * user already reauthenticated another way (e.g. password) but has Apple
 * linked: revoking the Apple token (App Store Guideline 5.1.1(v)) needs a
 * fresh code. Throws expo's ERR_REQUEST_CANCELED if the sheet is dismissed.
 */
export const requestAppleAuthorizationCode = async () => {
  const { appleCredential } = await requestAppleCredential();
  return appleCredential.authorizationCode ?? null;
};

/**
 * Revoke the user's Sign in with Apple token. Firebase exchanges the
 * authorization code with Apple server-side. Must run while still signed in.
 */
export const revokeAppleToken = async (authorizationCode) => {
  if (!authorizationCode) return;
  await revokeAccessToken(auth, authorizationCode);
};

// ---------------------------------------------------------------------------
// Sign in with Google
// ---------------------------------------------------------------------------

/**
 * Get the lazily-loaded Google Sign-In lib, configured. Throws when the
 * native module isn't in this binary. configure() is synchronous and must run
 * before any other GoogleSignin call; iosClientId is passed explicitly
 * because this app uses the Firebase JS SDK and ships no
 * GoogleService-Info.plist for the native lib to read.
 */
let googleConfigured = false;
const getConfiguredGoogle = () => {
  const mod = getGoogleSignIn();
  if (!mod) {
    throw new Error('Google sign-in is not available in this build.');
  }
  if (!googleConfigured) {
    mod.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    });
    googleConfigured = true;
  }
  return mod;
};

/**
 * True when this build can offer Google sign-in: native platform, native
 * module present, AND the OAuth client IDs have been filled in
 * (constants/googleSignInConfig.ts). Keeps the button hidden — rather than
 * crashing — on unconfigured builds.
 */
export const isGoogleSignInAvailable = () => {
  if (!GOOGLE_WEB_CLIENT_ID) return false;
  if (Platform.OS === 'ios' && !GOOGLE_IOS_CLIENT_ID) return false;
  return getGoogleSignIn() != null;
};

/**
 * Run the native Google sign-in flow and exchange the ID token for a
 * Firebase credential. Throws a `ERR_REQUEST_CANCELED`-coded error when the
 * user dismisses the account picker — the same code Apple cancellation uses,
 * so callers handle both identically.
 */
const requestGoogleCredential = async () => {
  const { GoogleSignin, isSuccessResponse } = getConfiguredGoogle();
  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    const err = new Error('Google sign-in was cancelled.');
    err.code = 'ERR_REQUEST_CANCELED';
    throw err;
  }
  const { idToken } = response.data;
  if (!idToken) {
    throw new Error('Google sign-in did not return an ID token.');
  }
  return GoogleAuthProvider.credential(idToken);
};

/**
 * Sign in (or up) with Google via Firebase. Unlike Apple, Google's ID token
 * always carries the user's name and email, and Firebase copies them onto the
 * profile automatically — no updateProfile dance needed.
 */
export const signInWithGoogle = async () => {
  const credential = await requestGoogleCredential();
  const userCredential = await signInWithCredential(auth, credential);
  return userCredential.user;
};

/**
 * Link Google as an ADDITIONAL sign-in method on the signed-in account.
 * See linkAppleToCurrentUser for why linking beats a fresh sign-in.
 */
export const linkGoogleToCurrentUser = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to link.');
  }
  const credential = await requestGoogleCredential();
  await linkWithCredential(user, credential);
};

/**
 * Re-authenticate the current user with a fresh Google credential (Firebase
 * requires a recent login before account deletion).
 */
export const reauthenticateWithGoogle = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to reauthenticate.');
  }
  const credential = await requestGoogleCredential();
  await reauthenticateWithCredential(user, credential);
};

/**
 * Best-effort cleanup of the native Google session so the account picker
 * shows again on the next sign-in (instead of silently reusing the last
 * account). Safe to call for non-Google users — it's a no-op failure.
 */
export const signOutGoogleNative = async () => {
  if (!isGoogleSignInAvailable()) return;
  try {
    const { GoogleSignin } = getConfiguredGoogle();
    await GoogleSignin.signOut();
  } catch (e) {
    console.log('[auth] Google native sign-out failed (non-fatal)', e);
  }
};

/**
 * Best-effort: disconnect the app from the user's Google account entirely
 * (revokes the grant, not just the session). Used on account deletion.
 */
export const revokeGoogleAccess = async () => {
  if (!isGoogleSignInAvailable()) return;
  try {
    const { GoogleSignin } = getConfiguredGoogle();
    await GoogleSignin.revokeAccess();
  } catch (e) {
    console.log('[auth] Google access revocation failed (non-fatal)', e);
  }
};

export const getCurrentUser = () =>
  new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) resolve(user);
      else reject(new Error('No user is currently signed in.'));
    });
  });

export const isUserSignedIn = () => !!auth.currentUser;

/** Send a password-reset email. Firebase handles the email + reset page. */
export const sendPasswordReset = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

/**
 * Re-authenticate the current user with their password. Firebase requires a
 * recent login before sensitive operations like account deletion; this throws
 * (auth/wrong-password / auth/invalid-credential) if the password is wrong.
 */
export const reauthenticateCurrentUser = async (password) => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No signed-in user to reauthenticate.');
  }
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
};

/** Permanently delete the current Firebase Auth user. Requires a recent login. */
export const deleteCurrentAuthUser = async () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('No signed-in user to delete.');
  }
  await firebaseDeleteUser(user);
};
