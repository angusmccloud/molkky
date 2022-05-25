import React, {useState} from 'react';
import { View } from 'react-native';
import { Button, Text } from '../../components';
import styles from './UserScreenStyles';

const UserScreen = ({ navigation, route }) => {
 
  return (
    <View style={styles.pageWrapper}>
      <Text>
        User Screen
      </Text>
    </View>
  );
}

export default UserScreen;