import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const IconButton = ({ icon, onPress, size = 24, color = 'black' }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button}>
      <MaterialIcons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
});

export default IconButton;