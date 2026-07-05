import React, { useCallback, useContext, useState } from 'react';
import { Platform, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Tabs } from 'expo-router';
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from 'expo-router/js-tabs';

import { HapticTab } from '@/components/navigation/HapticTab';
import TabBarBackground from '@/components/navigation/TabBarBackground';
import AdBanner from '@/components/AdBanner';
import Icon from '@/components/Icon';
import AuthModal from '@/containers/AuthModal';
import SyncStatusChip from '@/components/SyncStatusChip';
import { AdBannerProvider } from '@/contexts/AdBannerContext';

/**
 * Default bottom tab bar with the ad banner anchored directly above it, on
 * every tab. The navigator measures the tab bar through
 * BottomTabBarHeightCallbackContext; we intercept that callback to learn the
 * height ourselves (so the banner can sit `bottom: tabBarHeight`) and forward
 * it on so screens' useBottomTabBarHeight() keeps working. This works with
 * both tab bar modes: iOS's absolutely-positioned translucent bar and
 * Android's normal-flow bar. Screens pad their content by
 * useAdBannerHeight() so nothing hides behind the banner.
 */
const TabBarWithAdBanner = (props: BottomTabBarProps) => {
  const reportHeightToNavigator = useContext(BottomTabBarHeightCallbackContext);
  const [tabBarHeight, setTabBarHeight] = useState(0);

  const handleTabBarHeight = useCallback(
    (height: number) => {
      setTabBarHeight(height);
      reportHeightToNavigator?.(height);
    },
    [reportHeightToNavigator],
  );

  return (
    <>
      <View
        // Let touches on the (usually empty) side gutters fall through to
        // the content beneath; the ad itself stays tappable.
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarHeight }}
      >
        <AdBanner />
      </View>
      <BottomTabBarHeightCallbackContext.Provider value={handleTabBarHeight}>
        <BottomTabBar {...props} />
      </BottomTabBarHeightCallbackContext.Provider>
    </>
  );
};

export default function TabLayout() {
  const theme = useTheme();

  return (
    <AdBannerProvider>
      <Tabs
        tabBar={(props) => <TabBarWithAdBanner {...props} />}
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.onPrimary,
          headerRight: () => {
            return (
              <View style={{ marginRight: 10, flexDirection: 'row', alignItems: 'center' }}>
                <SyncStatusChip />
                <AuthModal />
              </View>
            )
          },
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Icon name='home' size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color }) => <Icon name='stats' size={28} color={color} />,
          }}
        />
        <Tabs.Screen
          name="rules"
          options={{
            title: 'Rules',
            tabBarIcon: ({ color }) => <Icon name='rules' size={28} color={color} />,
          }}
        />
      </Tabs>
    </AdBannerProvider>
  );
}
