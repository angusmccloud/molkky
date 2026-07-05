import { useContext } from 'react';
import { AdBannerContext } from '@/contexts/AdBannerContext';

/**
 * Current height of the floating ad banner (0 when hidden — ads removed,
 * failed to load, or unavailable). Add this to bottom content insets so
 * scrollable content clears the banner, e.g. alongside useBottomTabBarHeight.
 */
const useAdBannerHeight = (): number => {
  return useContext(AdBannerContext).bannerHeight;
};

export default useAdBannerHeight;
