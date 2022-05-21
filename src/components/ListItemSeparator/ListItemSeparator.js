import React from "react";
import { View } from "react-native";
import { colors } from '../../styles';

const ListItemSeparator = () => {
  return (
    <View style={{
      height: 1,
      marginLeft: 10,
      marginRight: 10,
      backgroundColor: colors.primaryBlue,
    }} />
  )
};

export default ListItemSeparator;