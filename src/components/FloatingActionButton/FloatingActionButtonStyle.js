import { StyleSheet, Dimensions } from 'react-native';
import { colors, typography, reusableStyles } from '../../styles';

const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  ...reusableStyles,
  fabStyle: {
    bottom: 16,
    right: 16,
    position: 'absolute',
    zIndex: 100,
  },
});

export default styles;