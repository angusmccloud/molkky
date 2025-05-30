import React from 'react';
import { StyleSheet } from 'react-native';
import { colors, typography, reusableStyles } from '../../styles';

const styles = StyleSheet.create({
  ...reusableStyles,
  inputWrapper: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 10,
    paddingRight: 10,
  },
  modalFriendWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 5,
  }
});

export default styles;