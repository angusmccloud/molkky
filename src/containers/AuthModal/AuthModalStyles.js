import { StyleSheet } from 'react-native';
import { colors, typography, reusableStyles } from '../../styles';

const styles = StyleSheet.create({
  ...reusableStyles,
  ActivityIndicatorWrapper: {
    padding: 20,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutWrapper: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInputWrapper: {
    marginBottom: 10,
  },
});

export default styles;