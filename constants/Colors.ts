//////// Custom Below, more cleanup to do....
import { MD3DarkTheme as PaperDarkTheme, MD3LightTheme as PaperDefaultTheme } from 'react-native-paper';

const primaryGreen = '#0A3314';
const greensDark = primaryGreen;
const greensMediumDark = '#325937';
const greensMedium = '#59825D';
const greensMediumLight = '#83AE87';
const greensLight = '#AFDBB2';
const greensSuperLight = '#F8FFF8';
const lightGreenGray = '#A0AfA0';
const darkGreenGray = '#6C7B6D';
const primaryBlue = '#0c62fb';
const bluesDark = primaryBlue;
const bluesMedium = '#00627C';
const bluesLight = '#97AFBA';
const grayMedium = '#92A19F';
const grayDark = '#4C656E';
const white = '#ffffff';
const black = '#000000';
// const red = '#FF0000';
const red = 'rgba(179, 38, 30, 1)';
const error = '#b55464';

// Slalom Brand Colors

export const darkNavy = '#09091c';
export const gray = '#8C8C8C';


// Paper Theming Info:
// https://callstack.github.io/react-native-paper/docs/guides/theming/

export const lightTheme = {
  ...PaperDefaultTheme,
  name: 'Light',
  dark: false,
  roundness: 4,
  animation: {
    scale: 1.0,
  },
  colors: {
    ...PaperDefaultTheme.colors,
    // Add all our colors here
    textDefault: primaryBlue,
    iconDefault: grayDark,
    background: white,
    onBackground: primaryBlue,
    modalBackground: primaryBlue,
    onModalBackground: white,
    modalHeader: primaryBlue,
    onModalHeader: white,
    primary: primaryBlue,
    onPrimary: white,
    primaryContainer: primaryBlue, // Used by AnimatedFAB
    onPrimaryContainer: white, // Used by AnimatedFAB
    disabled: grayMedium,
    onDisabled: primaryBlue,
    error: red,
    onError: white,
  },
};

// Not using this yet, will need to tweek if we do
export const darkTheme = {
  ...PaperDarkTheme,
  name: 'Dark',
  dark: true,
  roundness: 4,
  animation: {
    scale: 1.0,
  },
  colors: {
    ...PaperDarkTheme.colors,
    // Add all our colors here
    textDefault: white,
    iconDefault: white,
    background: black,
    onBackground: white,
    modalBackground: primaryBlue,
    onModalBackground: white,
    modalHeader: primaryBlue,
    onModalHeader: white,
    primary: primaryBlue,
    onPrimary: white,
    primaryContainer: primaryBlue, // Used by AnimatedFAB
    onPrimaryContainer: white, // Used by AnimatedFAB
    disabled: grayMedium,
    onDisabled: primaryBlue,
    error: red,
    onError: white,
  },
};

// Colors for the Avatar component
export const avatarColors = [
  { 
    color: '#F55127',
    textColor: white,
  },
  {
    color: '#0FCEF5',
    textColor: black,
  },
  {
    color: '#F5B327',
    textColor: black,
  },
  {
    color: '#02F5A7',
    textColor: black,
  },
  {
    color: '#09091c',
    textColor: white
  },
  {
    color: '#b05b08',
    textColor: white
  },
  {
    color: '#D949D7',
    textColor: white,
  },
  {
    color: '#FF4F9E',
    textColor: white,
  },
  {
    color: '#FF866C',
    textColor: black,
  },
  {
    color: '#FFC354',
    textColor: black,
  },
  {
    color: '#F9F871',
    textColor: black,
  },
  {
    color: '#9F9DD3',
    textColor: black,
  },
  {
    color: '#EFEDFF',
    textColor: black,
  },
  {
    color: '#BFA975',
    textColor: black,
  },
  {
    color: '#BFA975',
    textColor: black,
  },
  {
    color: '#FFEFCA',
    textColor: black,
  },
  {
    color: '#847655',
    textColor: white
  },
  {
    color: '#464555',
    textColor: white
  },
  {
    color: '#ABA9BC',
    textColor: black
  },
  {
    color: '#E80038',
    textColor: white
  },
  {
    color: '#FF4966',
    textColor: white
  },
  {
    color: '#4F8987',
    textColor: white
  },
  {
    color: '#6AFBCF',
    textColor: black
  },
  {
    color: '#00D6F4',
    textColor: black
  },
  {
    color: '#D03400',
    textColor: white
  },
  {
    color: '#A8A6DD',
    textColor: black
  },
  {
    color: '#464555',
    textColor: white
  }
];
