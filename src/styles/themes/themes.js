import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { DarkTheme as PaperDarkTheme, DefaultTheme as PaperDefaultTheme, configureFonts } from 'react-native-paper';
import * as colors from '../colors/colors';

const fontConfig = {
  web: {
    regular: {
      fontFamily: 'SlalomSans-Regular',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'SlalomSans-Regular',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'SlalomSans-Light',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'SlalomSans-Thin',
      fontWeight: '100',
    },
  },
  ios: {
    regular: {
      fontFamily: 'SlalomSans-Regular',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'SlalomSans-Regular',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'SlalomSans-Light',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'SlalomSans-Thin',
      fontWeight: '100',
    },
  },
  android: {
    regular: {
      fontFamily: 'SlalomSans-Regular',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'SlalomSans-Regular',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'SlalomSans-Light',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'SlalomSans-Thin',
      fontWeight: '100',
    },
  }
};

// List of all Paper theme colors here:
// https://github.com/callstack/react-native-paper/blob/main/src/styles/themes/v3/LightTheme.tsx

// Need to build this out...
export const lightTheme = {
  ...PaperDefaultTheme,
  ...NavigationDefaultTheme,
  dark: false,
  roundness: 4,
  version: 3,
  isV3: true,
  fonts: configureFonts(fontConfig),
  colors: {
    ...PaperDefaultTheme.colors,
    ...NavigationDefaultTheme.colors,
    primary: colors.primaryBlue,
    onPrimary: colors.white,
    primaryContainer: colors.primaryBlue,
    onPrimaryContainer: colors.white,
    secondary: colors.red,
    onSecondary: colors.white,
    secondaryContainer: colors.red,
    onSecondaryContainer: colors.white,
    tertiary: colors.gray,
    onTertiary: colors.white,
    tertiaryContainer: colors.gray,
    onTertiaryContainer: colors.white,
    accent: colors.primaryBlue, // Things like FAB
  },
};

// Need to build this out...
export const darkTheme = {
  ...PaperDarkTheme,
  ...NavigationDarkTheme,
  dark: true,
  roundness: 4,
  version: 3,
  isV3: true,
  fonts: configureFonts(fontConfig),
  colors: {
    ...PaperDarkTheme.colors,
    ...NavigationDarkTheme.colors,
  }
}