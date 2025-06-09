import React, { forwardRef, useMemo } from 'react';
import { TextInput as PaperTextInput, TextInputProps, useTheme } from 'react-native-paper';


// Patch: Fix TextInput type error by casting ref and props
const TextInput = forwardRef((props: TextInputProps, ref) => {
  const {mode = 'outlined', ...restOfProps} = props;
  const theme = useTheme();
  return (
    <PaperTextInput theme={theme} mode={mode} {...(restOfProps as any)} ref={ref as any} />
  )
});

export default TextInput;