// import * as Keychain from 'react-native-keychain';
import { Auth } from 'aws-amplify';
import jwt_decode from "jwt-decode";

const checkAuthStatus = async () => {
  console.log('-- Running checkAuthStatus --');
  try {
    const user = await Auth.currentAuthenticatedUser();
    // console.log('-- currentUser --', user);
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
      // signInTokens: {
      //   accessToken: tokens.accessToken.jwtToken,
      //   refreshToken: tokens.refreshToken.token,
      //   idToken: tokens.idToken.jwtToken,
      //   accessTokenExp: tokens.accessToken.payload.exp,
      // },
    }
    return authDetails;
  } catch (e) {
    console.log('-- User is not Authenticated --', e);
    const unauthedReturn = {
      isAuthed: false,
      authPending: false,
    };
    return unauthedReturn;
  }



  // try {
  //   const credentials = await Keychain.getInternetCredentials('auth');
  //   // console.log('---- credentials ----', credentials);

  //   if (credentials) {
  //     const { username, password } = credentials;
  //     const user = await Auth.signIn(username, password);
  //     console.log('-- User already logged in, send back credentials!');
  //     const authedUserObject = {
  //       isAuthed: true,
  //       authPending: false,
  //       authDetails: {
  //         id: user.attributes.sub,
  //         signInTokens: {
  //           accessToken: user.signInUserSession.accessToken.jwtToken,
  //           refreshToken: user.signInUserSession.refreshToken.token,
  //           idToken: user.signInUserSession.idToken.jwtToken,
  //           accessTokenExp: user.signInUserSession.accessToken.payload.exp,
  //         },
  //       },
  //     };
  //     // console.log('--- userObject ---', authedUserObject);
  //     return authedUserObject;
  //   } else {
  //     console.log('-- No Existing Credentials --');
  //     return unauthedReturn;
  //   }
  // } catch (err) {
  //   console.log('error', err); // eslint-disable-line
  //   if (err.code === 'UserNotConfirmedException') {
  //     const authPending = {
  //       isAuthed: false,
  //       authPending: true,
  //     };
  //     return authPending;
  //   } else {
  //     console.log('-- Default Unauthed Return --', err);
  //     return unauthedReturn;
  //   }
  // }
};

export default checkAuthStatus;