import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import shuffleSeed from 'shuffle-seed';
import { avatarColors } from '@/constants/Colors';
import Text from '@/components/Text';
// import ImageS3 from '../ImageS3/ImageS3';

const Avatar = (props) => {
  const theme = useTheme();
  const [staticBackground, setStaticBackground] = useState(theme.colors.onPrimary);
  const [staticTextColor, setStaticTextColor] = useState(theme.colors.primary);

  const [borderRadius, setBorderRadius] = useState(0);
  const [initials, setInitials] = useState('');

  const { fileName, name = '', size = 36, variant = 'rounded', textSize = 24, bold = false, height } = props;

  useEffect(() => {
    const initialsArray = name.split(' ');
    let newInitials = initialsArray[0].charAt(0);
    if (initialsArray.length > 1) {
      newInitials += initialsArray[initialsArray.length - 1].charAt(0);
    }
    setInitials(newInitials);
    const possibleColors = [ ...avatarColors ];
    const randomColors = shuffleSeed.shuffle(possibleColors, name);
    setStaticBackground(randomColors[0].color);
    setStaticTextColor(randomColors[0].textColor);
  }, [name]);

  useEffect(() => {
    if(variant === 'square') {
      setBorderRadius(0);
    } else if (variant === 'rounded') { 
      setBorderRadius(size / 4);
    } else if (variant === 'circle') {
      setBorderRadius(size / 2);
    }
  }, [size, variant]);

  const renderPlaceholder = (placeholderWidth, placeholderHeight, absolute) => {
    return renderInitials(placeholderWidth, borderRadius, staticBackground, staticTextColor, initials, textSize, bold, placeholderHeight, absolute)
  }

  // if (fileName) {
  //   // console.log('-- Avatar has File Name --', fileName, size, height, borderRadius);
  //   return (
  //     <>
  //       <ImageS3
  //         fileName={fileName}
  //         width={size}
  //         height={ height || size}
  //         borderRadius={borderRadius}
  //         placeholder={() => renderPlaceholder(size, height || size, true)}
  //         variant={variant}
  //       />
  //     </>
  //   );
  // }

  return renderPlaceholder(size, height || size, false);
}

export default Avatar;

const renderInitials = (size, borderRadius, staticBackground, staticTextColor, initials, textSize, bold, height, absolute) => {
  return (
    <View style={{position: absolute ? 'absolute' : 'relative', backgroundColor: staticBackground, width: size, height: height || size, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius}}>
      <Text color={staticTextColor} size={textSize} bold={bold}>
        {initials}
      </Text>
    </View>
  );
}