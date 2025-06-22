import { StyleSheet } from 'react-native';
import useReusableStyles from '@/hooks/useReusableStyles';
import useDeviceDimensions from '@/hooks/useDeviceDimensions';
import typography from '@/constants/Typography';

const useStyles = (theme) => {
  const reusableStyles = useReusableStyles(theme);
  const { width, height } = useDeviceDimensions();
  return StyleSheet.create({
    ...reusableStyles,
    playerWrapper: {
      // flexDirection: 'column',
      width: width - 20 - (typography.fontSizeXL + typography.fontSizeS) * 1.5,
      justifyContent: 'center',
      alignItems: 'flex-start',
      // paddingTop: 5,
      // paddingBottom: 5,
      // paddingLeft: 10,
      paddingRight: 10,
      // borderWidth: 1,
      // borderRadius: 10,
      // borderColor: colors.primaryBlue,
      marginTop: 5,
      marginBottom: 5,
      marginLeft: 10,
      marginRight: 10,
    },
    activePlayerWrapper: {
      backgroundColor: theme.colors.primary,
    },
    playerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    turnsWrapper: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingTop: 5,
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    buttonSectionWrapper: {
      borderTopWidth: 2,
      borderTopColor: theme.colors.primary,
      paddingTop: 5,
    },
    buttonsWrapper: {
      flexDirection: 'row',
      paddingTop: 5,
      paddingBottom: 5,
    },
    fourWideButton: {
      width: width * .16,
      height: width * .16,
      borderRadius: width * .08,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fourButtonWrapper: {
      width: '25%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    threeButtonWrapper: {
      width: '33%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    twoButtonWrapper: {
      width: '50%',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
};

export default useStyles;
