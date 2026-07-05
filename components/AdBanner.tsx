import React, { useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { BannerAd as BannerAdType } from 'react-native-google-mobile-ads';
import { getBannerAdUnitId } from '@/constants/ads';
import { getGoogleMobileAds } from '@/lib/ads';
import { AdBannerContext } from '@/contexts/AdBannerContext';
import { PurchaseContext } from '@/contexts/PurchaseContext';

/**
 * Anchored adaptive banner ad, shown for EVERYONE — signed in or not — except
 * users who own the remove-ads purchase. Renders null (no empty gap) when the
 * entitlement is owned or the native ads module isn't in this binary. When an
 * ad FAILS to load, the banner stays mounted but visually collapsed (height 0)
 * so a later retry/foreground reload can still recover it. Reports its
 * measured height to AdBannerContext so screens can inset their content.
 */
const AdBanner = () => {
  const { adsRemoved } = useContext(PurchaseContext);
  const ads = getGoogleMobileAds();

  if (adsRemoved || !ads) {
    return null;
  }
  return <AdBannerInner />;
};

const AdBannerInner = () => {
  const theme = useTheme();
  const { setBannerHeight } = useContext(AdBannerContext);
  const [failed, setFailed] = useState(false);
  const bannerRef = useRef<BannerAdType>(null);
  // Ref mirror for the AppState listener below (registered once, must see
  // the CURRENT failed state).
  const failedRef = useRef(failed);
  useEffect(() => {
    failedRef.current = failed;
  }, [failed]);

  // Only rendered when the module loaded (see AdBanner above).
  const ads = getGoogleMobileAds()!;
  const { BannerAd, BannerAdSize } = ads;

  // Foreground reload. On iOS, ALWAYS request a fresh ad when the app returns
  // to the foreground, as recommended by the library: iOS pauses ad refresh in
  // the background (and the WKWebView can come back blank). On both platforms,
  // retry a FAILED banner so a load failure isn't permanent.
  // (Inlined AppState listener rather than the library's useForeground hook
  // because that hook can't be imported statically — see lib/ads.ts.)
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'background' && nextState === 'active') {
        if (Platform.OS === 'ios' || failedRef.current) {
          bannerRef.current?.load();
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  // Zero out the reported height when the banner unmounts (e.g. the user
  // buys remove-ads and AdBanner starts returning null).
  useEffect(() => {
    return () => setBannerHeight(0);
  }, [setBannerHeight]);

  // On failure the BannerAd stays MOUNTED but the container collapses to
  // height 0 — unmounting it would make the failure permanent (nothing left
  // to call load() on), whereas a collapsed banner can be revived by the
  // foreground reload above or the SDK's own retry.
  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        ...(failed ? { height: 0, overflow: 'hidden' } : null),
      }}
      // Report 0 while failed/collapsed (no visible strip → no content inset).
      onLayout={(e) => setBannerHeight(failed ? 0 : e.nativeEvent.layout.height)}
    >
      <BannerAd
        ref={bannerRef}
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        // No ATT prompt is shown, so we must only ever serve
        // non-personalized ads (see lib/ads.ts request configuration).
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdLoaded={() => setFailed(false)}
        onAdFailedToLoad={(error) => {
          console.log('[ads] banner failed to load', error);
          setBannerHeight(0);
          setFailed(true);
        }}
      />
    </View>
  );
};

export default AdBanner;
