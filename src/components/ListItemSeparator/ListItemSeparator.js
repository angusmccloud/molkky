import React from "react";
import { View } from "react-native";
import { colors } from '../../styles';

const ListItemSeparator = () => {
  return (
    <View style={{ width: '100%', paddingLeft: 10, paddingRight: 10, height: 1 }}>
      <View style={{
        height: 1,
        backgroundColor: colors.primaryBlue,
        width: '100%',
      }} />
    </View>
  )
};

export default ListItemSeparator;