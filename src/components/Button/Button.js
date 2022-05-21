import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Text from '../Text/Text'
import { colors } from '../../styles';

const Button = ({
  variant = 'primary',
  disabled = false,
  activeOpacity = 0.8,
  text,
  size = 'large',
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
    borderColor: colors.darkNavy,
    borderRadius: 6,
    shadowColor: colors.darkNavy,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 2,
    elevation: 3,
    margin: 2,
    paddingTop: size === 'small' ? 10 : 14,
    paddingBottom: size === 'small' ? 10 : 14,
    paddingLeft: size === 'small' ? 14 : 20,
    paddingRight: size === 'small' ? 14 : 20,
    minWidth: '1%',
    flexDirection: 'row',
  }

  // These 2 are currently consistent on all buttons, adjust if needed
  let textColor = disabled ? colors.darkNavy : colors.white;
  const textSize = size === 'small' ? 'S' : 'M';
  const textBold = true;

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
        <Text size={textSize} bold={textBold} color={textColor}>
          {text}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default Button;