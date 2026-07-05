import { Platform } from 'react-native';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import useAdBannerHeight from '@/hooks/useAdBannerHeight';

/**
 * Bottom padding a tab screen's scrollable content needs so the last item can
 * be scrolled fully into view.
 *
 * On iOS the tab bar is `position: 'absolute'` (see app/(tabs)/_layout.tsx),
 * so content scrolls UNDER it and must be padded past its height. On Android
 * the tab bar is in normal layout flow, so it contributes nothing. The ad
 * banner floats above the tab bar on BOTH platforms (0 when hidden), so its
 * height is always added.
 */
const useBottomContentInset = (): number => {
  // Both hooks run unconditionally (rules of hooks) — only the RESULT is
  // platform-gated.
  const tabBarHeight = useBottomTabBarHeight();
  const adBannerHeight = useAdBannerHeight();
  return (Platform.OS === 'ios' ? tabBarHeight : 0) + adBannerHeight;
};

export default useBottomContentInset;
