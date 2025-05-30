import React from 'react';
import { StyleSheet } from 'react-native';
import { colors, typography, reusableStyles } from '../../styles';

const styles = StyleSheet.create({
  ...reusableStyles,
  buttonWrapper: {
    display: 'flex',
    width: '100%',
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    borderBottomColor: colors.primaryBlue,
    borderBottomWidth: 1,
  },
});

export default styles;