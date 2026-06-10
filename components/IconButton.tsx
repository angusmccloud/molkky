import * as React from 'react';
import { IconButton as PaperIconButton, IconButtonProps, useTheme } from 'react-native-paper';

// Widen Paper's mode with a "standard" sentinel — Paper itself uses an absent
// `mode` prop to get the transparent/standard look, but our wrapper defaults
// `mode` to "contained", so callers need an explicit way to opt out.
type IconButtonMode = NonNullable<IconButtonProps['mode']> | 'standard';
type Props = Omit<IconButtonProps, 'mode'> & { mode?: IconButtonMode };

const IconButton = ({ mode = 'contained', ...rest }: Props) => {
  const theme = useTheme();
  return (
    <PaperIconButton
      theme={theme}
      {...rest}
      mode={mode === 'standard' ? undefined : mode}
    />
  );
};

export default IconButton;
