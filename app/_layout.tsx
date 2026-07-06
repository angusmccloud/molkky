import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from '@/components/ErrorBoundary';
import { lightTheme, darkTheme } from '@/constants/Colors';
import { AuthProvider } from '@/contexts/AuthContext';
import { PurchaseProvider } from '@/contexts/PurchaseContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { initAds } from '@/lib/ads';
// Import Firebase instances to ensure they're initialized
import '@/lib/firebase';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Kick off the Google Mobile Ads SDK in the background. Runs once, never
  // throws, and never blocks first render — see lib/ads.ts.
  useEffect(() => {
    initAds();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/*
        ErrorBoundary sits inside GestureHandlerRootView (so its fallback can
        render) but OUTSIDE the providers, so a render crash in the theme,
        Paper, or AuthProvider is still caught instead of white-screening.
        Its fallback intentionally uses plain primitives, not these providers.
      */}
      <ErrorBoundary>
        <PaperProvider theme={colorScheme === 'dark' ? darkTheme : lightTheme}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AuthProvider>
              {/*
                PurchaseProvider sits inside AuthProvider because it mirrors
                the remove-ads entitlement to the signed-in user's Firestore
                doc. It mounts at the root (not per-screen) so replayed,
                unfinished store transactions are completed on every launch.
              */}
              <PurchaseProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen
                    name="contact"
                    options={{
                      title: 'Contact Us',
                      headerStyle: {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? darkTheme.colors.primary
                            : lightTheme.colors.primary,
                      },
                      headerTintColor:
                        colorScheme === 'dark'
                          ? darkTheme.colors.onPrimary
                          : lightTheme.colors.onPrimary,
                    }}
                  />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </PurchaseProvider>
            </AuthProvider>
          </ThemeProvider>
        </PaperProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
