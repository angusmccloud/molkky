import * as React from 'react';
import { AnimatedFAB } from 'react-native-paper';
import styles from './FloatingActionButtonStyle';

const FloatingActionButton = (props) => {
  const { icon, label, extended, onPress, visible, animatedFrom = 'right', iconMode = 'dynamic', ...restOfProps } = props;
  return (
    <AnimatedFAB
      icon={icon}
      label={label}
      extended={extended}
      onPress={onPress}
      visible={visible}
      animateFrom={animatedFrom}
      iconMode={iconMode}
      style={[styles.fabStyle]}
      variant='primary'
      color='white'
    />
  );
}

export default FloatingActionButton;