import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { colors } from '../../styles';
import Icon from '../Icon/Icon';

const IconButton = ({
  variant = 'primary',
  disabled = false,
  activeOpacity = 0.8,
  iconName,
  size = 32,
  onPress,
  testID = '',
}) => {
  // Default everything to match Primary with Size Large
  let buttonStyle = {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: disabled
      ? colors.gray
      : colors.primaryBlue,
    borderWidth: 0,
    padding: size / 3,
    borderRadius: size,
  }

  // These 2 are currently consistent on all buttons, adjust if needed
  let textColor = disabled ? colors.darkNavy : colors.white;

  if (variant === 'secondary') {
    textColor = disabled
      ? colors.gray
      : colors.primaryBlue;
    buttonStyle.backgroundColor = colors.white;
    buttonStyle.borderColor = colors.gray
  } // Add more button variants here!

  const pressHandler = () => {
    if (!disabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={() => pressHandler()}
      testID={testID}>
      <View
        style={buttonStyle}>
          <Icon name={iconName} size={size} color={textColor} />
      </View>
    </TouchableOpacity>
  );
};

export default IconButton;