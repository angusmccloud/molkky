import React from "react";
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../styles';

const Icon = (props) => {
  const { name, size = 32, color = colors.primaryBlue, ...restOfProps } = props;
  const iconName = getIconName(name);

  return (
    <Ionicons name={iconName} size={size} color={color} {...restOfProps} />
  );
};

export default Icon;

// As we need more icons, add the conversion from friendly-names to Ionicons names here
// Controlling by user-friendly names so if we switch from Ionicons to Awesome, etc... We just change this file
// https://ionicons.com/
const getIconName = (name) => {
  let iconName = 'home';
  if (name === 'home') {
    iconName = 'home';
  } else if (name === 'homeFocused') {
    iconName = 'home-outline';
  } else if (name === 'rules') {
    iconName = 'help-circle';
  } else if (name === 'rulesFocused') {
    iconName = 'help-circle-outline';
  } else if (name === 'user') {
    iconName = 'person-circle';
  } else if (name === 'userFocused') {
    iconName = 'person-circle-outline';
  } else if (name === 'addItem') {
    iconName = 'add-circle-outline';
  } else if (name === 'edit') {
    iconName = 'create-outline';
  } else if (name === 'close') {
    iconName = 'close-outline';
  } else if (name === 'arrowRight') {
    iconName = 'arrow-forward-circle-outline';
  } else if (name === 'skip') {
    iconName = 'arrow-redo-outline';
  } else if (name === 'wentOver') {
    iconName = 'backspace-outline';
  } else if (name === 'winner') {
    iconName = 'trophy';
  } else if (name === 'play') {
    iconName = 'play'
  }

  return iconName;
}