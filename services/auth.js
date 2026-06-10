import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser as firebaseDeleteUser,
} from 'firebase/auth';
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
  return user;
};

export const signInUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOutUser = () => signOut(auth);

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
