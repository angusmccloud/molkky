import { StyleSheet, Dimensions } from 'react-native';
import { colors, typography, reusableStyles } from '../../styles';

const { height, width } = Dimensions.get('window');

const styles = StyleSheet.create({
  ...reusableStyles,
  zoomViewWrapper: {
    height: '100%',
    width: '100%',
  },
  zoomContentWrapper: {
    height: '100%',
    width: '100%',
  },
});

export default styles;