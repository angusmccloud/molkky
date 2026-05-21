import { View, type ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';

export default function PageWrapper({ style, children, ...otherProps }: ViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[{ backgroundColor: theme.colors.background, flex: 1 }, style]}
      {...otherProps}
    >
      {children}
    </View>
  );
}
