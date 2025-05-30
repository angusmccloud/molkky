import React from "react";
import { MaterialIndicator } from 'react-native-indicators';
import { colors } from '../../styles';

const ActivityIndicator = (props) => {
  const { color = colors.primaryBlue, size = 20, ...restOfProps } = props;
  return (
    <MaterialIndicator size={size} color={color} {...restOfProps} />
  )
};

export default ActivityIndicator;