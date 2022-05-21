import React, {useState} from 'react';
import { View } from 'react-native';
import { Button, Text } from '../../components';
import styles from './HomeScreenStyles';

const HomeScreen = () => {
 
  return (
    <View style={styles.pageWrapper}>
      <Text>
        Home Screen
      </Text>
    </View>
  );
}

export default HomeScreen;