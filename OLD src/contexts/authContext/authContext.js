import * as React from "react";

export const unauthedUser = {
  isAuthed: false,
  authPending: false,
};

export const AuthContext = React.createContext(
  unauthedUser // Default auth status
);