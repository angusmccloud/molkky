import React, { useState, useRef, useContext, useMemo } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useTheme } from "react-native-paper";
import typography from '@/constants/Typography';
import Icon from '@/components/Icon';
import Text from '@/components/Text';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Avatar from '@/components/Avatar';
import TextInput from '@/components/TextInput';
import { AuthContext } from '@/contexts/AuthContext';
import useStyles from './AuthModalStyles'; // Assuming you have a styles file

const AuthModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [currentView, setCurrentView] = useState("create");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authInProgress, setAuthInProgress] = useState(false);
  const [formError, setFormError] = useState("");
  // const [forgetPWCode, setForgetPWCode] = useState("");
  // const [newPassword, setNewPassword] = useState("");
  // const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const { user, isAuthenticated, loading, error, signUp, signIn, signOut } = authContext;

  const authStatus = {
    isAuthed: isAuthenticated,
    name: user?.providerData[0].displayName || '',
    email: user?.providerData[0].email || '',
  };

  const theme = useTheme();
  const styles = useMemo(() => useStyles(theme), [theme]);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAuthInProgress(false);
    setCurrentView("create");
    setFormError("");
    setEmail("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    // setForgetPWCode("");
    // setNewPassword("");
    // setForgetPWCode("");
    // setConfirmNewPassword("");
  };

  const processSignIn = async (pwd) => {
    setAuthInProgress(true);
    if (email.length === 0 || pwd.length === 0) {
      setFormError("Email and Password are required");
      setAuthInProgress(false);
      return;
    }
    try {
      const signedInUser = await signIn(email, pwd);
      setAuthStatus(signedInUser);
      console.log('-- Sign in Successful --', signedInUser);
      closeModal();
    } catch (err) {
      setAuthInProgress(false);
      const code = err?.code;
      console.log(" -- Didn't Work --", code);
      // Firebase error codes: https://firebase.google.com/docs/reference/js/auth.md#autherrorcodes
      if (code === "auth/user-not-found") {
        setFormError("User does not exist");
      } else if (code === "auth/wrong-password") {
        setFormError("Incorrect password");
      } else if (code === "auth/invalid-email") {
        setFormError("The email address is invalid");
      } else if (code === "auth/too-many-requests") {
        setFormError("Too many failed attempts. Please try again later.");
      } else if (code === "auth/invalid-credential") {
        setFormError("Invalid credentials provided, check your email and password and try again");
      } else {
        setFormError(err?.message || "There was an error signing in, please check your credentials and try again");
      }
    }
  };

  const processCreateAccount = async () => {
    setAuthInProgress(true);
    if (
      email.length === 0 ||
      name.length === 0 ||
      password.length === 0 ||
      confirmPassword.length === 0
    ) {
      setFormError("Email, Name, Password, and Confirmed Password are required");
      setAuthInProgress(false);
    } else if (password !== confirmPassword) {
      setFormError("Password and Confirmed Password do not match");
      setAuthInProgress(false);
    } else {
      try {
        const newUser = await signUp(email, password, name);
        console.log('User created successfully:', newUser);
        closeModal();
      } catch (err) {
        const code = err?.code || "";
        let message = "There was an error creating your account";
        if (code === "auth/email-already-in-use") {
          message = "An account with this email already exists";
        } else if (code === "auth/invalid-email") {
          message = "The email address is invalid";
        } else if (code === "auth/weak-password") {
          message = "Password is too weak (minimum 6 characters)";
        } else if (code === "auth/operation-not-allowed") {
          message = "Account creation is currently disabled";
        } else if (err?.message) {
          message = err.message;
        }
        setFormError(message);
        setAuthInProgress(false);
      }
    }
  };

  const logoutPressHandler = async () => {
    try {
      setAuthInProgress(true);
      await signOut(); // Replace with Firebase Sign Out
      closeModal();
    } catch (err) {
      console.log("error signing out...", err);
      setFormError("There was an error signing out");
    }
  };

  // const sendResetPasswordLink = async () => {
  //   setAuthInProgress(true);
  //   // Send confirmation code to user's email
  //   try {
  //     await Auth.forgotPassword(email);
  //     changeViews("updatePassword");
  //   } catch (err) {
  //     console.log(err);
  //     setFormError("There is no account associated with this email.");
  //   }
  //   setAuthInProgress(false);
  // };

  const changeViews = (newView) => {
    setFormError("");
    setCurrentView(newView);
    setConfirmPassword("");
  };

  const ref_loginPassword = useRef();
  const ref_createName = useRef();
  const ref_createPassword = useRef();
  const ref_createPasswordConfirm = useRef();

  return (
    <>
      <Pressable onPress={openModal}>
        <View>
          {authStatus?.isAuthed ? (
            <Avatar
              name={authStatus.name}
              fileName={authStatus.picture?.url}
              size={typography.fontSizeXXL}
              variant="rounded"
              textSize='M'
            />
          ) : (
            <Icon
              name="user"
              color={theme.colors.onBackground}
              iconSize={typography.fontSizeXXL}
            />
          )}
        </View>
      </Pressable>
      <Modal
        visible={showModal}
        onRequestClose={closeModal}
        onBackButtonPress={closeModal}
        onBackdropPress={closeModal}
        avoidKeyboard={true}
        style={{ padding: 0, margin: 0 }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <Button
                  variant="onModalHeader"
                  onPress={closeModal}
                  size="small"
                >
                  Cancel
                </Button>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text color={theme.colors.onBackground} bold size="M">
                  {authStatus.isAuthed
                    ? "User"
                    : currentView === "login"
                    ? "Sign In"
                    : currentView === "create"
                    ? "Sign Up"
                    : "Reset Password"}
                </Text>
              </View>
              <View style={{ flex: 1 }}></View>
            </View>
            <ScrollView>
              {authStatus.isAuthed && (
                <View style={styles.logoutWrapper}>
                  <Text style={{ marginBottom: 10 }}>
                    You are currently logged in as {authStatus.name} (
                    {authStatus.email})
                  </Text>
                  <Button
                    variant="primary"
                    onPress={logoutPressHandler}
                    disabled={authInProgress}
                  >
                    Logout
                  </Button>
                  {/* <View style={{ paddingTop: 10 }}>
                    <Button
                      text="Manage Profile"
                      variant="secondary"
                      onPress={goToUserPage}
                    />
                  </View> */}
                </View>
              )}
              {!authStatus.isAuthed && currentView === "login" && (
                <View style={{ padding: 10, alignItems: "center" }}>
                  <Text bold style={{ marginBottom: 10 }}>
                    Login to track your games and see your stats
                  </Text>
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="next"
                    label="Email Address"
                    value={email}
                    enablesReturnKeyAutomatically={true}
                    autoCompleteType="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    onChangeText={(text) => setEmail(text)}
                    onSubmitEditing={() => ref_loginPassword.current.focus()}
                  />
                  <TextInput
                    onChangeText={(text) => setPassword(text)}
                    onSubmitEditing={() => processSignIn(password)}
                    label="Password"
                    autoCompleteType="password"
                    clearButtonMode="while-editing"
                    enablesReturnKeyAutomatically={true}
                    maxLength={50}
                    returnKeyType="go"
                    secureTextEntry={true}
                    textContentType="password"
                    value={password}
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    ref={ref_loginPassword}
                  />
                  {formError !== "" && (
                    <Text
                      color={theme.colors.error}
                      style={{ marginTop: 10, marginBottom: 10 }}
                    >
                      {formError}
                    </Text>
                  )}
                  <Button
                    variant="primary"
                    onPress={() => processSignIn(password)}
                    disabled={authInProgress}
                  >
                    Login
                  </Button>
                  {/* <View style={{ marginTop: 10 }}>
                    <Button
                      text="Forgot Password?"
                      variant="primary"
                      onPress={() => changeViews("forgotPassword")}
                      disabled={authInProgress}
                    />
                  </View> */}
                  <View style={{ marginTop: 10 }}>
                    <Button
                      variant="secondary"
                      onPress={() => changeViews("create")}
                    >
                      Create New Account
                    </Button>
                  </View>
                </View>
              )}
              {!authStatus.isAuthed && currentView === "create" && (
                <View style={styles.modalContentWrapper}>
                  <Text bold style={{ paddingBottom: 10, paddingTop: 10, paddingLeft: 5, paddingRight: 5 }}>
                    Create a new account to track your games and see your stats
                  </Text>
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="next"
                    label="Email Address"
                    value={email}
                    enablesReturnKeyAutomatically={true}
                    autoCompleteType="email"
                    textContentType="emailAddress"
                    keyboardType="email-address"
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    onChangeText={(text) => setEmail(text)}
                    onSubmitEditing={() => ref_createName.current.focus()}
                  />
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="next"
                    label="Name"
                    value={name}
                    autoCapitalize="words"
                    enablesReturnKeyAutomatically={true}
                    textContentType="name"
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    onChangeText={(text) => setName(text)}
                    onSubmitEditing={() => ref_createPassword.current.focus()}
                    ref={ref_createName}
                  />
                  <TextInput
                    onChangeText={(text) => setPassword(text)}
                    label="Password"
                    autoCompleteType="password"
                    clearButtonMode="while-editing"
                    enablesReturnKeyAutomatically={true}
                    maxLength={50}
                    returnKeyType="next"
                    secureTextEntry={true}
                    textContentType="newPassword"
                    value={password}
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    ref={ref_createPassword}
                    onSubmitEditing={() =>
                      ref_createPasswordConfirm.current.focus()
                    }
                  />
                  <TextInput
                    onChangeText={(text) => setConfirmPassword(text)}
                    onSubmitEditing={() => processCreateAccount()}
                    placeholder="Confirm Password"
                    label="Confirm Password"
                    autoCompleteType="password"
                    clearButtonMode="while-editing"
                    enablesReturnKeyAutomatically={true}
                    maxLength={50}
                    returnKeyType="go"
                    secureTextEntry={true}
                    textContentType="newPassword"
                    value={confirmPassword}
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    ref={ref_createPasswordConfirm}
                  />
                  {formError !== "" && (
                    <Text style={{ marginTop: 10, marginBottom: 10 }} color={theme.colors.error}>
                      {formError}
                    </Text>
                  )}
                  <Button
                    variant="primary"
                    onPress={processCreateAccount}
                    disabled={authInProgress}
                  >
                    Create Account
                  </Button>
                  <View style={{ marginTop: 10, marginBottom: 10 }}>
                    <Button
                      variant="secondary"
                      onPress={() => changeViews("login")}
                    >
                      Login to Existing Account
                    </Button>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default AuthModal;