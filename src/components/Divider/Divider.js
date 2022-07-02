import React, { memo } from "react";
import { View } from "react-native";
import { colors } from '../../styles';

// function Divider (props) {
const Divider = (props) => {
  const { height = 1, color = colors.primaryBlue, margin = 10, ...restOfProps } = props;
  return (
    <View style={{
      height: height,
      marginLeft: margin,
      marginRight: margin,
      backgroundColor: color,
    }}
      {...restOfProps}
    />
  )
};

export default memo(Divider);