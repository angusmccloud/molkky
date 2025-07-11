import * as Progress from 'react-native-progress';
import { useTheme } from 'react-native-paper';

const ActivityIndicator = (props) => {
  const theme = useTheme();
  const { color = theme.colors.primary, size = 20, thickness = 5, ...restOfProps } = props;
  return (
    <Progress.Circle thickness={thickness} size={size} indeterminate={true} color={color} {...restOfProps} />
  )
};

export default ActivityIndicator;