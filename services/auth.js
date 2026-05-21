import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';

/**
 * Thin wrappers around Firebase Auth.
 *
 * Note: We no longer fetch the user's Firestore record here. The AuthContext
 * subscribes to onAuthStateChanged and runs the offline-first backfill
 * (services/backfill.ts) which is responsible for creating the Firestore user
 * doc, merging friends, and pushing local games up. Keeping auth.js dumb
 * means signIn/signUp succeed quickly without waiting on extra Firestore
 * round-trips that might fail offline.
 */

export const signUpNewUser = async (email, password, displayName) => {
  const auth = getAuth();
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
  const auth = getAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOutUser = () => {
  const auth = getAuth();
  return signOut(auth);
};

export const getCurrentUser = () =>
  new Promise((resolve, reject) => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
      else reject(new Error('No user is currently signed in.'));
    });
  });

export const isUserSignedIn = () => {
  const auth = getAuth();
  return !!auth.currentUser;
};
