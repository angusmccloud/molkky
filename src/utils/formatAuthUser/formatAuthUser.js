import jwt_decode from "jwt-decode";
import { unauthedUser } from '../../contexts';

const formatAuthUser = async (user, newUser) => {
  try {
    if(newUser) {
      // Need to format differently for a newUser because the object returned by Amplify is different
      const authDetails = {
        isAuthed: true,
        authPending: false, // This app automatically approves users
        id: user.userSub,
        email: newUser.attributes.email,
        name: newUser.attributes.name,
        picture: undefined,
        isAdmin: false, // New user can'tbe an Admin yet
      }
      return authDetails;
    }
    const { sub, email, name, picture } = user.attributes;
    const tokens = user.signInUserSession;
    const idToken = jwt_decode(tokens.idToken.jwtToken);
    const authDetails = {
      isAuthed: true,
      authPending: false,
      id: sub,
      email: email,
      name: name,
      picture: picture ? JSON.parse(picture) : undefined,
      isAdmin: idToken['cognito:groups'] !== undefined && idToken['cognito:groups'].includes('Admin'),
    }
    return authDetails;
  } catch (error) {
    console.log('-- formatAuthUser Error --', error);
    return unauthedUser;
  }
}

export default formatAuthUser;