import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { colors, typography, reusableStyles } from '../../styles';

const dim = Dimensions.get('screen');
const width = dim.width;
const height = dim.height;

const styles = StyleSheet.create({
  ...reusableStyles,
  playerWrapper: {
    // flexDirection: 'column',
    width: width - 20 - ((typography.fontSizeXL + typography.fontSizeS) * 1.5),
    justifyContent: 'center',
    alignItems: 'flex-start',
    // paddingTop: 5,
    // paddingBottom: 5,
    // paddingLeft: 10,
    paddingRight: 10,
    // borderWidth: 1,
    // borderRadius: 10,
    // borderColor: colors.primaryBlue,
    marginTop: 5,
    marginBottom: 5,
    marginLeft: 10,
    marginRight: 10,
  },
  activePlayerWrapper: {
    backgroundColor: colors.lightBlue,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  turnsWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 5,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  buttonSectionWrapper: {
    borderTopWidth: 5,
    borderTopColor: colors.primaryBlue,
  }
});

export default styles;