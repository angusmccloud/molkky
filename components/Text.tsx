import * as React from "react";
import {
  Text as PaperText,
  TextProps as PaperTextProps,
  useTheme,
} from "react-native-paper";
import typography from '@/constants/Typography';

export enum TextSizes {
  XXS = "XXS",
  XS = "XS",
  S = "S",
  M = "M",
  L = "L",
  XL = "XL",
  XXL = "XXL",
  XXXL = "XXXL",
}
interface TextProps extends PaperTextProps {
  size?: TextSizes;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  numberOfLines?: number;
  style?: any;
  color?: string | undefined;
  children: string;
}

const Text = (props: TextProps) => {
  const theme = useTheme();
  const {
    size = TextSizes.M,
    bold = false,
    italic = false,
    underline = false,
    numberOfLines = 0,
    style,
    color = theme.colors.textDefault,
    ...restOfProps
  } = props;
  const textSize = sizeToVariant(size);
  const fontFamily = bold && italic ? 'SourceSansPro-BoldItalic' : bold ? 'SourceSansPro-Bold' : italic ? 'SourceSansPro-Italic' : 'SourceSansPro-Regular';

  return (
    <PaperText
      {...restOfProps}
      theme={theme}
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      style={{
        ...style,
        fontSize: textSize,
        fontWeight: bold ? "700" : "400",
        fontFamily: fontFamily,
        lineHeight: textSize * 1.3,
        color: color,
        fontStyle: italic ? "italic" : "normal",
        textDecorationLine: underline ? "underline" : "none",
      }}
    />
  );
};

export default Text;

const sizeToVariant = (size) => {
  switch (size) {
    case TextSizes.XXXL:
      return typography.fontSizeXXXL;
    case TextSizes.XXL:
      return typography.fontSizeXXL;
    case TextSizes.XL:
      return typography.fontSizeXL;
    case TextSizes.L:
      return typography.fontSizeL;
    case TextSizes.M:
      return typography.fontSizeM;
    case TextSizes.S:
      return typography.fontSizeS;
    case TextSizes.XS:
      return typography.fontSizeXS;
    case TextSizes.XXS:
      return typography.fontSizeXXS;
    default:
      return typography.fontSizeM;
  }
};
