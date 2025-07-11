import * as React from 'react';
import { Divider as PaperDivider, DividerProps, useTheme } from 'react-native-paper';

const Divider = (props: DividerProps) => {
  const theme = useTheme();
  return (
    <PaperDivider theme={theme} {...props} />
  );
}

export default Divider;