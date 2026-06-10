import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { initializeAuth, getAuth, type Auth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence is only typed in the react-native
// build's declarations; Metro resolves the RN entry at runtime.
import { getReactNativePersistence } from 'firebase/auth';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import firebaseConfig from '@/constants/firebaseConfig';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth persistence.
// `@react-native-async-storage/async-storage` v3 deprecates the default-export
// singleton (it now resolves to a "legacy / migration-only" store). Per the
// Firebase Auth RN docs, v3 should create a named storage instance via
// `createAsyncStorage(...)` and hand that to `getReactNativePersistence`.
const authStorage = createAsyncStorage('firebaseAuth');

// `initializeAuth` throws if auth was already initialized for this app (e.g. a
// Fast Refresh re-runs this module). Fall back to the existing instance so we
// never crash and never silently drop to in-memory persistence.
let authInstance: Auth;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(authStorage),
  });
} catch {
  authInstance = getAuth(app);
}
export const auth = authInstance;

// Firestore.
// React Native's network stack does not reliably support Firestore's default
// WebChannel streaming transport, and `experimentalAutoDetectLongPolling` (on
// by default) frequently fails to detect this — surfacing as "Could not reach
// Cloud Firestore backend" / "transport errored" and stalled reads/writes.
// Forcing long-polling is the documented fix for RN (FirestoreSettings docs).
// Must use `initializeFirestore` (not `getFirestore`) so settings apply.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
