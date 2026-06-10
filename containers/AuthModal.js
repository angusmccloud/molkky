import React, { useState, useRef, useContext } from "react";
import { View, Pressable, ScrollView, Linking } from "react-native";
import { useTheme } from "react-native-paper";
import { exportUserData } from '@/services/dataExport';

const PRIVACY_POLICY_URL = 'https://connortyrrell.com/privacy-policy-mobile-apps/';
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
  const [infoMessage, setInfoMessage] = useState("");

  const authContext = useContext(AuthContext);
  if (!authContext) {
    throw new Error('AuthContext must be used within an AuthProvider');
  }
  const {
    user,
    isAuthenticated,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    deleteAccount,
  } = authContext;

  const authStatus = {
    isAuthed: isAuthenticated,
    name: user?.providerData?.[0]?.displayName || '',
    email: user?.providerData?.[0]?.email || '',
  };

  const theme = useTheme();
  // useStyles is a hook (it calls useReusableStyles); call it directly at the
  // top level. Wrapping it in useMemo would call a hook inside a callback
  // (rules-of-hooks violation) and is unnecessary — StyleSheet.create is cheap.
  const styles = useStyles(theme);

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAuthInProgress(false);
    setCurrentView("create");
    setFormError("");
    setInfoMessage("");
    setEmail("");
    setName("");
    setPassword("");
    setConfirmPassword("");
  };

  const processSignIn = async () => {
    setAuthInProgress(true);
    if (email.length === 0 || password.length === 0) {
      setFormError("Email and Password are required");
      setAuthInProgress(false);
      return;
    }
    try {
      const signInSuccessful = await signIn(email, password);
      // console.log('-- signInSuccessful --', signInSuccessful)
      if (signInSuccessful) {
        // setAuthStatus(signedInUser);
        // console.log('-- Sign in Successful --', signedInUser);
        closeModal();
      } else {
        setFormError("There was an error signing in, please check your credentials and try again");
        setAuthInProgress(false);
      }
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
        await signUp(email, password, name);
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

  const processForgotPassword = async () => {
    setAuthInProgress(true);
    setInfoMessage("");
    if (email.length === 0) {
      setFormError("Enter your email address");
      setAuthInProgress(false);
      return;
    }
    try {
      await sendPasswordReset(email);
      setFormError("");
      setInfoMessage(
        "If an account exists for that email, a password reset link is on its way. Check your inbox."
      );
    } catch (err) {
      const code = err?.code;
      if (code === "auth/invalid-email") {
        setFormError("The email address is invalid");
      } else {
        // Don't reveal whether an account exists — show the same neutral message.
        setFormError("");
        setInfoMessage(
          "If an account exists for that email, a password reset link is on its way. Check your inbox."
        );
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  const processDeleteAccount = async () => {
    setAuthInProgress(true);
    if (password.length === 0) {
      setFormError("Enter your password to confirm");
      setAuthInProgress(false);
      return;
    }
    try {
      await deleteAccount(password);
      closeModal();
    } catch (err) {
      const code = err?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setFormError("Incorrect password");
      } else if (code === "auth/too-many-requests") {
        setFormError("Too many attempts. Please try again later.");
      } else {
        setFormError(err?.message || "Could not delete account, please try again");
      }
      setAuthInProgress(false);
    }
  };

  const changeViews = (newView) => {
    setFormError("");
    setInfoMessage("");
    setCurrentView(newView);
    setPassword("");
    setConfirmPassword("");
  };

  const handleExportData = async () => {
    setFormError("");
    try {
      await exportUserData();
    } catch (err) {
      console.log("data export failed", err);
      setFormError("Couldn't export your data. Please try again.");
    }
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
              color={theme.colors.onPrimary}
              iconSize={typography.fontSizeXXL}
            />
          )}
        </View>
      </Pressable>
      <Modal
        isVisible={showModal}
        onBackButtonPress={closeModal}
        onBackdropPress={closeModal}
        avoidKeyboard={true}
        style={{ padding: 0, margin: 0 }}
      >
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
                {currentView === "delete"
                  ? "Delete Account"
                  : authStatus.isAuthed
                  ? "User"
                  : currentView === "login"
                  ? "Sign In"
                  : currentView === "create"
                  ? "Sign Up"
                  : currentView === "forgot"
                  ? "Reset Password"
                  : "Sign Up"}
              </Text>
            </View>
            <View style={{ flex: 1 }}></View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {authStatus.isAuthed && currentView !== "delete" && (
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
                <View style={{ paddingTop: 20 }}>
                  <Button
                    variant="secondary"
                    onPress={handleExportData}
                    disabled={authInProgress}
                  >
                    Export My Data
                  </Button>
                </View>
                <View style={{ paddingTop: 20 }}>
                  <Button
                    variant="secondary"
                    onPress={() => changeViews("delete")}
                    disabled={authInProgress}
                  >
                    Delete Account
                  </Button>
                </View>
              </View>
            )}
            {authStatus.isAuthed && currentView === "delete" && (
              <View style={styles.logoutWrapper}>
                <Text bold style={{ marginBottom: 10 }}>
                  Delete your account?
                </Text>
                <Text style={{ marginBottom: 10, textAlign: "center" }}>
                  This permanently deletes your account and all of your games
                  from the cloud. This cannot be undone. Enter your password to
                  confirm.
                </Text>
                <TextInput
                  onChangeText={(text) => {
                    setPassword(text);
                    setFormError("");
                  }}
                  onSubmitEditing={processDeleteAccount}
                  label="Password"
                  autoCompleteType="password"
                  clearButtonMode="while-editing"
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
                  onPress={processDeleteAccount}
                  disabled={authInProgress}
                >
                  Permanently Delete Account
                </Button>
                <View style={{ marginTop: 10 }}>
                  <Button
                    variant="secondary"
                    onPress={() => changeViews("create")}
                    disabled={authInProgress}
                  >
                    Cancel
                  </Button>
                </View>
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
                  onChangeText={(text) => {
                    setEmail(text);
                    setFormError("");
                  }}
                  onSubmitEditing={() => ref_loginPassword.current.focus()}
                />
                <TextInput
                  onChangeText={(text) => {
                    setPassword(text);
                    setFormError("");
                  }}
                  onSubmitEditing={processSignIn}
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
                  onPress={processSignIn}
                  disabled={authInProgress}
                >
                  Login
                </Button>
                <View style={{ marginTop: 10 }}>
                  <Button
                    variant="secondary"
                    onPress={() => changeViews("forgot")}
                    disabled={authInProgress}
                  >
                    Forgot Password?
                  </Button>
                </View>
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
            {!authStatus.isAuthed && currentView === "forgot" && (
              <View style={{ padding: 10, alignItems: "center" }}>
                <Text bold style={{ marginBottom: 10 }}>
                  Enter your email and we&apos;ll send you a reset link
                </Text>
                <TextInput
                  clearButtonMode="while-editing"
                  maxLength={50}
                  returnKeyType="go"
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
                  onChangeText={(text) => {
                    setEmail(text);
                    setFormError("");
                  }}
                  onSubmitEditing={processForgotPassword}
                />
                {formError !== "" && (
                  <Text
                    color={theme.colors.error}
                    style={{ marginTop: 10, marginBottom: 10 }}
                  >
                    {formError}
                  </Text>
                )}
                {infoMessage !== "" && (
                  <Text
                    style={{ marginTop: 10, marginBottom: 10, textAlign: "center" }}
                  >
                    {infoMessage}
                  </Text>
                )}
                <Button
                  variant="primary"
                  onPress={processForgotPassword}
                  disabled={authInProgress}
                >
                  Send Reset Link
                </Button>
                <View style={{ marginTop: 10 }}>
                  <Button
                    variant="secondary"
                    onPress={() => changeViews("login")}
                    disabled={authInProgress}
                  >
                    Back to Sign In
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
                  onChangeText={(text) => {
                    setEmail(text);
                    setFormError("");
                  }}
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
                  onChangeText={(text) => {
                    setPassword(text);
                    setFormError("");
                  }}
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
            {/* Always-visible footer — the privacy policy must be reachable
                from inside the app (App Store / Play requirement) regardless of
                auth state or which sub-view is showing. */}
            <Pressable
              onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
              style={{ paddingVertical: 16, alignItems: "center" }}
              accessibilityRole="link"
              accessibilityLabel="Open the privacy policy"
            >
              <Text size="S" color={theme.colors.primary}>
                Privacy Policy
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default AuthModal;