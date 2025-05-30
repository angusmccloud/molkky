import { View, type ViewProps } from 'react-native';
import { useTheme } from 'react-native-paper';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PageWrapper({ style, children, ...otherProps }: ViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[{ backgroundColor: theme.colors.background, flex: 1, marginBottom: Constants.statusBarHeight + insets.bottom }, style]} {...otherProps} >
      {children}
    </View>
  );
}
