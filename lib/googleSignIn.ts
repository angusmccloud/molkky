import { Platform } from 'react-native';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let cached: GoogleSignInModule | null | undefined;

/**
 * Lazily require the Google Sign-In library. Its native spec calls
 * `TurboModuleRegistry.getEnforcing('RNGoogleSignin')` AT IMPORT TIME, which
 * throws when the native module isn't compiled into the binary (Expo Go, or a
 * dev client built before this dependency was added). A static `import` would
 * therefore crash the entire app on those builds — this getter contains the
 * failure to "Google sign-in unavailable" instead.
 */
export const getGoogleSignIn = (): GoogleSignInModule | null => {
  if (cached !== undefined) return cached;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    // The lib has .web.js entries that import fine, but we only offer the
    // native Google flow, so don't bother loading it elsewhere.
    cached = null;
    return cached;
  }
  try {
    cached = require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch (e) {
    console.log(
      '[googleSignIn] native module unavailable — rebuild the app to enable Google sign-in',
      e,
    );
    cached = null;
  }
  return cached ?? null;
};
