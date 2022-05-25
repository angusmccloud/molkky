import { Auth } from 'aws-amplify';
import * as SecureStore from 'expo-secure-store';
import jwt_decode from "jwt-decode";

const checkAuthStatus = async () => {
  console.log('-- Running checkAuthStatus --');
  try {
    const user = await Auth.currentAuthenticatedUser();
    const { sub, email, name } = user.attributes;
    const tokens = user.signInUserSession;
    const idToken = jwt_decode(tokens.idToken.jwtToken);
    const authDetails = {
      isAuthed: true,
      authPending: false,
      id: sub,
      email: email,
      name: name,
      isAdmin: idToken['cognito:groups'] !== undefined && idToken['cognito:groups'].includes('Admin'),
    }
    return authDetails;
  } catch (e) {
    console.log('-- currentAuthenticatedUsers didn\'t find a user --', e);
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
      console.log('-- User successfully signed in with stored credentials --');
      const { sub, name } = user.attributes;
      const tokens = user.signInUserSession;
      const idToken = jwt_decode(tokens.idToken.jwtToken);
      const authDetails = {
        isAuthed: true,
        authPending: false,
        id: sub,
        email: email,
        name: name,
        isAdmin: idToken['cognito:groups'] !== undefined && idToken['cognito:groups'].includes('Admin'),
      }
      console.log('--- userObject ---', authDetails);
      return authDetails;
    } else {
      const unauthedReturn = {
        isAuthed: false,
        authPending: false,
      };
      return unauthedReturn;
    }
  } catch (e) {
    console.log('-- Error authenticating with SecureStore --', e);
    const unauthedReturn = {
      isAuthed: false,
      authPending: false,
    };
    return unauthedReturn;
  }
}