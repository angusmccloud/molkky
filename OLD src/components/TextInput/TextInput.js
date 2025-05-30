import React, { forwardRef } from 'react';
import { TextInput as RNTextInput } from 'react-native';
import { colors } from '../../styles';
// import styles from './TextInputStyles';

const TextInput = forwardRef((props, ref) => {
  const { placeholderTextColor = colors.textInputPlaceholder, ...restOfProps} = props;

  return (
    <RNTextInput
      {...restOfProps}
      ref={ref}
      placeholderTextColor={placeholderTextColor}
    />
  );
});

export default TextInput;