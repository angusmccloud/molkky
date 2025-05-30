import * as React from 'react';
import { IconButton as PaperIconButton, IconButtonProps, useTheme } from 'react-native-paper';

const IconButton = (props: IconButtonProps) => {
  const theme = useTheme();
  return (
    <PaperIconButton theme={theme} {...props} />
  );
}

export default IconButton;