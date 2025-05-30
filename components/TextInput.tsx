import React, { forwardRef, useMemo } from 'react';
import { TextInput as PaperTextInput, TextInputProps, useTheme } from 'react-native-paper';

const TextInput = forwardRef((props: TextInputProps, ref) => {
  const {mode = 'outlined', ...restOfProps} = props;
  const theme = useTheme();
  
  return (
    <PaperTextInput theme={theme} mode={mode} {...props} ref={ref} />
  )
});

export default TextInput;