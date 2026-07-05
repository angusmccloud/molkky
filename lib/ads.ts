type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

let cached: GoogleMobileAdsModule | null | undefined;
let initStarted = false;

/**
 * Lazily require react-native-google-mobile-ads. Its spec modules call
 * `TurboModuleRegistry.getEnforcing(...)` AT IMPORT TIME, which throws when
 * the native module isn't compiled into the binary (Expo Go, or a dev client
 * built before this dependency was added). A static `import` would therefore
 * crash the entire app on those builds — this getter contains the failure to
 * "ads unavailable" instead. Mirrors lib/googleSignIn.ts.
 */
export const getGoogleMobileAds = (): GoogleMobileAdsModule | null => {
  if (cached !== undefined) return cached;
  try {
    cached = require('react-native-google-mobile-ads') as GoogleMobileAdsModule;
  } catch (e) {
    console.log(
      '[ads] native module unavailable — rebuild the app to enable ads',
      e,
    );
    cached = null;
  }
  return cached ?? null;
};

/**
 * Initialize the Google Mobile Ads SDK. Safe to call from a useEffect on
 * mount: it runs once, never throws, and never blocks rendering — banner ads
 * simply start filling once initialization completes in the background.
 */
export const initAds = (): void => {
  if (initStarted) return;
  initStarted = true;
  const ads = getGoogleMobileAds();
  if (!ads) return;
  void (async () => {
    try {
      // G-rated, non-personalized inventory only (no ATT prompt is shown, so
      // we must never request personalized ads — see components/AdBanner.tsx).
      await ads.default().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.G,
      });
      await ads.default().initialize();
    } catch (e) {
      console.log('[ads] initialization failed (non-fatal)', e);
    }
  })();
};
