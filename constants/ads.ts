import { Platform } from 'react-native';
import { getGoogleMobileAds } from '@/lib/ads';

/**
 * AdMob configuration.
 *
 * iOS is configured with the real AdMob app + banner unit (app ID lives in the
 * react-native-google-mobile-ads plugin block in app.json; changing it requires
 * a NATIVE REBUILD, not just a JS update). Android still points at Google's
 * OFFICIAL TEST ids — deliberate, since the Android launch is deferred. Before
 * any Play Store release, create the Android app in the AdMob console, put its
 * App ID in app.json (androidAppId, native rebuild), and replace the android
 * banner unit id below (see BEFORE_ANDROID.md §4).
 */
const PROD_BANNER_AD_UNIT_ID = Platform.select({
  ios: 'ca-app-pub-4413447709373186/3365260435',
  // TODO(owner): Android still uses Google's official ADAPTIVE_BANNER test unit
  // id as a safe placeholder — replace before any Play Store release.
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
