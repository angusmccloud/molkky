import React from "react";
import { ActivityIndicator as RNActivityIndicator } from "react-native";
import { colors } from '../../styles';

const ActivityIndicator = (props) => {
  const { color = colors.primaryBlue, size = 'large' } = props;
  return (
    <RNActivityIndicator size={size} color={color} />
  )
};

export default ActivityIndicator;