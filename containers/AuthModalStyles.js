import { StyleSheet } from 'react-native';
import useReusableStyles from '@/hooks/useReusableStyles';

const useStyles = theme => {
  const reusableStyles = useReusableStyles(theme);
  return StyleSheet.create({
    ...reusableStyles,
    logoutWrapper: {
      padding: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    textInputWrapper: {
      marginBottom: 10,
    },
    forgotPasswordText: {
      textAlign: 'right',
    },
  });
}

export default useStyles;