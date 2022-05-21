import React from 'react';
import { Text as RNText } from 'react-native';
import { colors, typography } from '../../styles';
import { useFonts } from 'expo-font';

const Text = ({ 
  size = 'M',
  children,
  style,
  bold = false,
  light = false,
  color = colors.textDefault,
  numberOfLines = 0,
  ...rest
 }) => {
  [fontsLoaded] = useFonts({
    'SlalomSans-Light': require('../../assets/fonts/SlalomSans-Light.otf'),
    'SlalomSans-Regular': require('../../assets/fonts/SlalomSans-Regular.otf'),
    'SlalomSans-Bold': require('../../assets/fonts/SlalomSans-Bold.otf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  const fontFamily = bold ? 'SlalomSans-Bold' : light ? 'SlalomSans-Light' : 'SlalomSans-Regular';

  return (
    <RNText
      {...rest}
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      style={{
        ...style,
        fontSize: getSize(size),
        fontFamily: fontFamily,
        fontWeight: bold
          ? typography.fontWeightBold
          : typography.fontWeightRegular,
        color,
      }}>
      {children}
    </RNText>
  );
};

export default Text;

const getSize = (size) => {
  switch (size) {
    case 'XXS':
      return typography.fontSizeXXS;
    case 'XS':
      return typography.fontSizeXS;
    case 'S':
      return typography.fontSizeS;
    case 'M':
      return typography.fontSizeM;
    case 'L':
      return typography.fontSizeL;
    case 'XL':
      return typography.fontSizeXL;
    case 'XXL':
      return typography.fontSizeXXL;
    default:
      return typography.fontSizeM;
  }
};