import { PixelRatio, Dimensions } from 'react-native';

const dim = Dimensions.get('screen');
const { width, height } = dim;
const tablet = Math.max(height, width) > 900 ? true : false;

const scaleFont = (size) => {
  return size * PixelRatio.getFontScale();
};

// FONT WEIGHT
export const fontWeightLight = '200';
export const fontWeightRegular = '400';
export const fontWeightBold = '700';

// FONT SIZE
export const fontSizeXXS = scaleFont(tablet ? 15: 10);
export const fontSizeXS = scaleFont(tablet ? 18 : 12);
export const fontSizeS = scaleFont(tablet ? 21 : 14);
export const fontSizeM = scaleFont(tablet ? 24 : 16);
export const fontSizeL = scaleFont(tablet ? 30 : 20);
export const fontSizeXL = scaleFont(tablet ? 36 : 24);
export const fontSizeXXL = scaleFont(tablet ? 42: 28);
export const fontSizeXXXL = scaleFont(tablet ? 72: 48);