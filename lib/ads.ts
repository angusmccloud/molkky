type GoogleMobileAdsModule = typeof import('react-native-google-mobile-ads');

let cached: GoogleMobileAdsModule | null | undefined;
let initStarted = false;
// Memoizes the one-time SDK startup so the two startAdsSdk() callers below
// (post-consent + stored-consent, run in parallel) initialize the SDK at most
// once. The assignment is synchronous after the guard, so it's race-safe.
let adsSdkStartPromise: Promise<void> | null = null;

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
 * Dev-only override to force the UMP consent form's geography so the EEA/UK flow
 * can be tested from a device outside Europe. Set to 'EEA' locally to simulate a
 * European user (the consent form should appear), or 'NOT_EEA' to simulate
 * elsewhere (no form). Leave null to use the device's real location. Has NO
 * effect in release builds. On a physical device you must also register it as a
 * test device with AdMob; simulators are auto-whitelisted. Pair with
 * `AdsConsent.reset()` to re-show the form after answering it once.
 */
const DEBUG_CONSENT_GEOGRAPHY: 'EEA' | 'NOT_EEA' | null = null;

/**
 * Start the Google Mobile Ads SDK — but only once consent permits it. Returns
 * early while `canRequestAds` is false (e.g. an EEA user who hasn't answered the
 * form yet); the post-consent caller invokes this again once they have. The
 * memoized promise guarantees the actual initialize() runs at most once.
 */
const startAdsSdk = (ads: GoogleMobileAdsModule) => async (): Promise<void> => {
  const { canRequestAds } = await ads.AdsConsent.getConsentInfo();
  if (!canRequestAds) return;
  if (!adsSdkStartPromise) {
    adsSdkStartPromise = (async () => {
      // G-rated, non-personalized inventory only (no ATT prompt is shown, so
      // we must never request personalized ads — see components/AdBanner.tsx).
      await ads.default().setRequestConfiguration({
        maxAdContentRating: ads.MaxAdContentRating.G,
      });
      await ads.default().initialize();
    })();
  }
  return adsSdkStartPromise;
};

/**
 * Gather EEA/UK user consent (Google's UMP), then initialize the ads SDK.
 *
 * Google requires a UMP consent flow for EEA/UK users even for the
 * non-personalized inventory we serve, so on every launch we refresh consent
 * info and present the consent form when required BEFORE requesting any ads.
 * Outside the EEA/UK the form never shows and ads start immediately. Safe to
 * call from a mount effect: runs once, never throws, never blocks render.
 */
export const initAds = (): void => {
  if (initStarted) return;
  initStarted = true;
  const ads = getGoogleMobileAds();
  if (!ads) return;

  const start = startAdsSdk(ads);
  const logStartError = (e: unknown) =>
    console.log('[ads] SDK start failed (non-fatal)', e);

  // Refresh consent + show the UMP form where required. debugGeography only
  // applies in dev (see DEBUG_CONSENT_GEOGRAPHY); prod passes no options.
  const consentOptions =
    __DEV__ && DEBUG_CONSENT_GEOGRAPHY
      ? {
          debugGeography:
            DEBUG_CONSENT_GEOGRAPHY === 'EEA'
              ? ads.AdsConsentDebugGeography.EEA
              : ads.AdsConsentDebugGeography.NOT_EEA,
        }
      : undefined;

  void (async () => {
    try {
      await ads.AdsConsent.gatherConsent(consentOptions);
    } catch (e) {
      // On failure the UMP SDK falls back to the previous session's consent.
      console.log('[ads] consent gathering failed (non-fatal)', e);
    }
    await start().catch(logStartError);
  })();

  // In parallel, try to start from consent stored in a previous session so a
  // returning user's ads don't wait on the consent round trip.
  void start().catch(logStartError);
};
