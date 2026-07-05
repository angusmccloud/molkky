import { Platform } from 'react-native';
import { getGoogleMobileAds } from '@/lib/ads';

/**
 * AdMob configuration.
 *
 * TODO(owner): BEFORE RELEASE — everything ad-related currently points at
 * Google's OFFICIAL TEST ids (intentional while the AdMob account isn't set
 * up yet). To ship real ads you must:
 *   1. Create the app in the AdMob console (one per platform) and copy the
 *      real App IDs into the react-native-google-mobile-ads plugin block in
 *      app.json (androidAppId / iosAppId). Changing the App ID requires a
 *      NATIVE REBUILD (expo prebuild + new binary), not just a JS update.
 *   2. Create an anchored adaptive banner ad unit per platform and replace
 *      the PROD_BANNER_AD_UNIT_ID placeholders below with the real unit ids.
 * Until step 2 happens, release builds fall back to Google's test banner
 * unit ids below — they show test ads rather than crashing or earning.
 */
const PROD_BANNER_AD_UNIT_ID = Platform.select({
  // TODO(owner): replace with the real AdMob banner unit ids. These are
  // Google's official ADAPTIVE_BANNER test unit ids as safe placeholders.
  ios: 'ca-app-pub-3940256099942544/2435281174',
  android: 'ca-app-pub-3940256099942544/9214589741',
  default: 'ca-app-pub-3940256099942544/9214589741',
});

/**
 * The banner ad unit id to request. In dev builds this is always Google's
 * test unit (requesting real ads from a dev build risks an AdMob account
 * ban); in release builds it's the production unit id above.
 *
 * A function (not a constant) because the TestIds constant lives in
 * react-native-google-mobile-ads, which must be lazy-required — see
 * lib/ads.ts.
 */
export const getBannerAdUnitId = (): string => {
  if (__DEV__) {
    const testId = getGoogleMobileAds()?.TestIds?.ADAPTIVE_BANNER;
    if (testId) return testId;
  }
  return PROD_BANNER_AD_UNIT_ID;
};
