import React from 'react';
import { Text as RNText, TextProps } from 'react-native';

const Text: React.FC<TextProps> = ({ children, style, ...props }) => {
  return (
    <RNText style={[{ fontSize: 16, color: '#000' }, style]} {...props}>
      {children}
    </RNText>
  );
};

export default Text;