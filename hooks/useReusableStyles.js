import { StyleSheet } from 'react-native';
import typography from '@/constants/Typography';
import useDeviceDimensions from '@/hooks/useDeviceDimensions';

const useReusableStyles = theme => {
  const { width, height } = useDeviceDimensions();
  return StyleSheet.create({
    pageWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modalBackground: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: 'rgba(52, 52, 52, 0.8)',
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    modalBody: {
      backgroundColor: theme.colors.background,
      borderRadius: 10,
      justifyContent: 'flex-start',
      alignSelf: 'center',
      overflow: 'hidden',
      width: width * .8,
      maxHeight: height * .8,
    },
    modalHeader: {
      backgroundColor: theme.colors.modalHeader,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
    },
    modalHeaderLightBackground: {
      backgroundColor: theme.colors.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 10,
    },
    modalContentWrapper: {
      alignItems: 'center',
    },
    modalScrollView: {
      padding: 10,
      width: '100%',
    },
    modalFullScreenBackground: {
      width: width,
      height: height,
    },
    modalFullScreenBody: {
      borderRadius: 0,
      width: width,
      height: height,
      backgroundColor: theme.colors.background,
      justifyContent: 'flex-start',
      overflow: 'hidden',
    },  
    modalFullScreenHeader: {
      paddingTop: 10,
      paddingBottom: 10,
    },
    textInput: {
      // backgroundColor: theme.colors.onSecondaryContainer,
      alignSelf: 'center',
    },
    modalTextInput: {
      width: width * .8 * .9,
    },
    modalFullScreenTextInput: {
      width: width - 40,
    },
    fullWidthTextInput: {
      width: '100%'
    },
    quarterWidth: {
      width: width * .25
    },
    oneThirdsWidth: {
      width: width * .33
    },
    halfWidth: {
      width: width * .5
    },
    twoThirdsWidth: {
      width: width * .6
    },
    threeQuarterWidth: {
      width: width * .75
    },
    inputMultiLine: {
      minHeight: (typography.fontSizeM * 3) + (10 * 2),
    },
    inputLargeMultiLine: {
      minHeight: (typography.fontSizeM * 5) + (10 * 2),
      textAlignVertical: 'top',
    },
    popupMenuOptions: {
      width: width,
      alignItems: "center",
      backgroundColor: theme.colors.onPrimaryContainer,
    },
    popupMenuOption: {
      backgroundColor: theme.colors.onPrimaryContainer,
      width: width,
      paddingBottom: 10,
    },
    fabStyle: {
      bottom: 16,
      right: 16,
      position: 'absolute',
      zIndex: 100,
    },
    zoomWrapper: {
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
    },
    imageWrapper: {
      width: '100%',
      paddingTop: 10,
    },
    modalActivityIndicatorWrapper: {
      padding: 20,
      marginTop: 10,
      marginBottom: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    pageActivityIndicatorWrapper: {
      flex: 1,
      width: '100%',
      alignContent: 'center',
      justifyContent: 'center',
    },
    fakeTextInput: {
      padding: 10,
      borderColor: theme.colors.primary,
      borderWidth: 1,
      borderRadius: 5,
      alignSelf: 'center',
    },
    dropdown: {
      height: 50,
      borderColor: theme.colors.primary,
      borderWidth: 0.5,
      borderRadius: 3,
      paddingHorizontal: 8,
      marginBottom: -5,
    },
    dropdownLabelWrapper: {
      position: 'absolute',
      backgroundColor: theme.colors.background,
      left: 22,
      top: 7,
      zIndex: 999,
      paddingHorizontal: 8,
    },
    dropdownItemText: {
      color: theme.colors.onBackground,
      fontSize: typography.fontSizeS,
    },
    dropdownPlaceholder: {
      fontSize: typography.fontSizeS,
      color: theme.colors.primary,
    },
    dropdownSelectedText: {
      fontSize: typography.fontSizeS,
      color: theme.colors.primary,
    },
    dropdownIcon: {
      width: typography.fontSizeL,
      height: typography.fontSizeL,
    },
    dropdownWrapper: {
      backgroundColor: theme.colors.background,
      padding: typography.fontSizeS,
    },
    tabWrapper: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomColor: theme.colors.primary,
      borderBottomWidth: 2,
      backgroundColor: theme.colors.background,
    },
    tabItem: {
      // flex: 1,
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopRightRadius: 20,
      borderTopLeftRadius: 20,
    },
  });
}

export default useReusableStyles;