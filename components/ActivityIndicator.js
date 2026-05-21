import { ActivityIndicator as PaperActivityIndicator, useTheme } from 'react-native-paper';

const ActivityIndicator = (props) => {
  const theme = useTheme();
  const { color = theme.colors.primary, size = 20, ...restOfProps } = props;
  return (
    <PaperActivityIndicator animating color={color} size={size} {...restOfProps} />
  );
};

export default ActivityIndicator;
