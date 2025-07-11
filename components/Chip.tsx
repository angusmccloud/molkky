import * as React from 'react';
import { Chip as PaperChip, ChipProps, useTheme } from 'react-native-paper';

const Chip = (props: ChipProps) => {
  const theme = useTheme();
  const { mode = 'outlined', elevated = true, ...restOfProps } = props;
  return (
    <PaperChip theme={theme} mode={mode} elevated={elevated} {...restOfProps} />
  );
}

export default Chip;