import { StyleSheet, Dimensions } from 'react-native';
import * as colors from '../colors/colors';
import * as typography from '../typography/typography';

const dim = Dimensions.get('screen');
const { width, height } = dim;

const reusableStyles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    backgroundColor: colors.white,
  },
  scrollablePageWrapper: {
    backgroundColor: colors.white,
    height: height,
    width: width,
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
    backgroundColor: colors.white,
    borderRadius: 10,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    width: width * .9,
  },
  modalHeader: {
    backgroundColor: colors.primaryBlue,
    borderBottomColor: colors.darkBlue,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  modalContentWrapper: {
    alignItems: 'center',
  },
  textInput: {
    fontSize: typography.fontSizeM,
    fontWeight: typography.fontWeightRegular,
    // fontFamily: typography.fontFamilyRegular,
    padding: 10,
    borderColor: colors.borderColor,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: colors.white,
    width: width * .8 * .9,
    alignSelf: 'center',
  },
  inputSingleLine: {
    height: typography.fontSizeM + (10 * 2),
  },
  inputMultiLine: {
    minHeight: (typography.fontSizeM * 3) + (10 * 2),
  },
  inputSmall: {
    maxWidth: (typography.fontSizeM * 4) + (10 * 2),
  },
  buttonsWrapper: {
    flexDirection: 'row',
    paddingTop: 5,
    paddingBottom: 5,
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

export default reusableStyles;