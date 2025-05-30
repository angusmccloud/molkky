import { Auth } from 'aws-amplify';
import * as SecureStore from 'expo-secure-store';
import { unauthedUser } from '../../contexts';
import formatAuthUser from '../formatAuthUser/formatAuthUser';

const checkAuthStatus = async () => {
  // console.log('-- Running checkAuthStatus --');
  try {
    const user = await Auth.currentAuthenticatedUser();
    const formattedUsed = await formatAuthUser(user);
    return formattedUsed;
  } catch (e) {
    // console.log('-- currentAuthenticatedUsers didn\'t find a user --', e);
    const loginAuth = await loginWithSecureStore();
    return loginAuth;
  }
};

export default checkAuthStatus;

const loginWithSecureStore = async () => {
  try {
    const credentials = await SecureStore.getItemAsync('auth');
    if(credentials) {
      const { email, password } = JSON.parse(credentials);
      const user = await Auth.signIn(email, password);
      const formattedUsed = await formatAuthUser(user);
      return formattedUsed;
    } else {
      return unauthedUser;
    }
  } catch (e) {
    // console.log('-- Error authenticating with SecureStore --', e);
    return unauthedUser;
  }
}