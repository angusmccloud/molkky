import * as React from 'react';
import { Switch as PaperSwitch, SwitchProps, useTheme } from 'react-native-paper';

const Switch = (props: SwitchProps) => {
  const theme = useTheme();
  return (
    <PaperSwitch theme={theme} {...props} />
  );
}

export default Switch;