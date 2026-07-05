import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

let available: boolean | undefined;

/**
 * True when this binary contains the ExpoIap native module. Importing
 * 'expo-iap' itself is safe (its native access is lazy), but mounting its
 * `useIAP` hook registers native event listeners, which throws when the
 * module isn't compiled in (Expo Go, or a dev client built before this
 * dependency was added). Gate any component that calls `useIAP` behind this
 * check so those builds degrade to "purchases unavailable" instead of
 * crashing. Mirrors lib/googleSignIn.ts.
 */
export const isIapAvailable = (): boolean => {
  if (available !== undefined) return available;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    // We only sell through the native App Store / Play Store flows.
    available = false;
    return available;
  }
  try {
    requireNativeModule('ExpoIap');
    available = true;
  } catch (e) {
    console.log(
      '[iap] native module unavailable — rebuild the app to enable purchases',
      e,
    );
    available = false;
  }
  return available;
};
