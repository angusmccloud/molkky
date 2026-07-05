import React, { createContext, ReactNode, useMemo, useState } from 'react';

/**
 * Shares the measured height of the ad banner (components/AdBanner.tsx) with
 * screens so they can pad their scroll content — the banner floats above the
 * tab bar, so without this padding the last row would hide behind it. Height
 * is 0 whenever no banner is showing (ads removed, load failure, module
 * unavailable). Screens read it via hooks/useAdBannerHeight.
 */
interface AdBannerContextType {
  bannerHeight: number;
  setBannerHeight: (height: number) => void;
}

export const AdBannerContext = createContext<AdBannerContextType>({
  bannerHeight: 0,
  setBannerHeight: () => {},
});

export const AdBannerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [bannerHeight, setBannerHeight] = useState(0);
  const value = useMemo(() => ({ bannerHeight, setBannerHeight }), [bannerHeight]);
  return <AdBannerContext.Provider value={value}>{children}</AdBannerContext.Provider>;
};
