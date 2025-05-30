import React, { useState, useEffect, useCallback } from 'react';
import { View } from 'react-native';
import Navigation from './navigation/navigation';
import { unauthedUser, AuthContext } from './contexts';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { checkAuthStatus } from './utils';

const customFonts = {
  'SlalomSans-Bold': require('./assets/fonts/SlalomSans-Bold.otf'),
  'SlalomSans-BoldItalic': require('./assets/fonts/SlalomSans-BoldItalic.otf'),
  'SlalomSans-Italic': require('./assets/fonts/SlalomSans-Italic.otf'),
  'SlalomSans-Light': require('./assets/fonts/SlalomSans-Light.otf'),
  'SlalomSans-LightItalic': require('./assets/fonts/SlalomSans-LightItalic.otf'),
  'SlalomSans-Regular': require('./assets/fonts/SlalomSans-Regular.otf'),
  'SlalomSans-Thin': require('./assets/fonts/SlalomSans-Thin.otf'),
  'SlalomSans-ThinItalic': require('./assets/fonts/SlalomSans-ThinItalic.otf'),
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [authStatus, setAuthStatus] = useState(unauthedUser);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Keep the splash screen visible while we fetch resources
        await SplashScreen.preventAutoHideAsync();
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync(customFonts);
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    const loadAuth = async () => {
      const user = await checkAuthStatus();
      // console.log('-- user --', user);
      setAuthStatus(user);
    }

    prepare();
    loadAuth();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ authStatus, setAuthStatus }}>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Navigation />
      </View>
    </AuthContext.Provider>
  );
}
