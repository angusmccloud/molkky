import React from 'react';
import { Platform, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/navigation/HapticTab';
import TabBarBackground from '@/components/navigation/TabBarBackground';
import Icon from '@/components/Icon';
import AuthModal from '@/containers/AuthModal';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerRight: () => {
          return (
            <View style={{marginRight: 10,}}>
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
      {/* Screens in Tab-Stack that we don't want to show */}
      <Tabs.Screen
        name="new-game"
        options={{
          title: 'New Game',
          href: null,
        }}
      />
    </Tabs>
  );
}
