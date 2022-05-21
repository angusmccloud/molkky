import { PixelRatio, Dimensions } from 'react-native';

const dim = Dimensions.get('screen');
const width = dim.width;
const height = dim.height;
const tablet = Math.max(height, width) > 900 ? true : false;

const scaleFont = (size) => {
  return size * PixelRatio.getFontScale();
};

// FONT WEIGHT
export const fontWeightLight = '200';
export const fontWeightRegular = '400';
export const fontWeightBold = '700';

// FONT SIZE
export const fontSizeXXS = scaleFont(tablet ? 12: 10);
export const fontSizeXS = scaleFont(tablet ? 14 : 12);
export const fontSizeS = scaleFont(tablet ? 16 : 14);
export const fontSizeM = scaleFont(tablet ? 18 : 16);
export const fontSizeL = scaleFont(tablet ? 22 : 20);
export const fontSizeXL = scaleFont(tablet ? 26 : 24);
export const fontSizeXXL = scaleFont(tablet ? 36: 28);