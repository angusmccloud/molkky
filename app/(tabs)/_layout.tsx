import React from 'react';
import { Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/navigation/HapticTab';
import TabBarBackground from '@/components/navigation/TabBarBackground';
import Icon from '@/components/Icon';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        // headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        // tabBarButton: HapticTab,
        // tabBarBackground: TabBarBackground,
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
        name="standings"
        options={{
          title: 'Standings',
          tabBarIcon: ({ color }) => <Icon name='standings' size={28} color={color} />,
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
  );
}
