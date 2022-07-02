import React, { useState, useRef, useContext } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { Auth } from "aws-amplify";
import * as SecureStore from "expo-secure-store";
import { useNavigation } from "@react-navigation/native";
import { Users } from "../../models";
import { colors, typography } from "../../styles";
import { Icon, Text, Button, Modal, Avatar, TextInput } from "../../components";
import { DataStore, formatAuthUser } from "../../utils/";
import { AuthContext, unauthedUser } from "../../contexts";
import styles from "./AuthModalStyles";

const AuthModal = () => {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [currentView, setCurrentView] = useState("create");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authInProgress, setAuthInProgress] = useState(false);
  const [error, setError] = useState("");
  const [forgetPWCode, setForgetPWCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const auth = useContext(AuthContext);
  const { authStatus, setAuthStatus } = auth;

  const openModal = () => {
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAuthInProgress(false);
    setCurrentView("create");
    setError("");
    setEmail("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    setForgetPWCode("");
    setNewPassword("");
    setForgetPWCode("");
    setConfirmNewPassword("");
  };

  const processSignIn = async (pwd) => {
    setAuthInProgress(true);
    if (email.length === 0 || pwd.length === 0) {
      setError("Email and Password are required");
      setAuthInProgress(false);
    }
    try {
      const signedIn = await Auth.signIn(email, pwd);
      const user = await formatAuthUser(signedIn);
      setAuthStatus(user);
      // console.log('-- Sign in Successful --', signedIn);
      const credentials = { email, password: pwd };
      await SecureStore.setItemAsync("auth", JSON.stringify(credentials));
      // console.log(' -- And stored in the SecureStore --');
      closeModal();
    } catch ({ code }) {
      setAuthInProgress(false);
      // console.log(" -- Didn't Work --", code);
      if (code === "UserNotConfirmedException") {
        setError("Account not verified yet");
      } else if (code === "PasswordResetRequiredException") {
        setError("Existing user found. Please reset your password");
      } else if (code === "NotAuthorizedException") {
        setError("Forgot Password?");
      } else if (code === "UserNotFoundException") {
        setError("User does not exist");
      } else {
        setError(code);
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
      setError("Email, Name, Password, and Confirmed Password are required");
      setAuthInProgress(false);
    } else if (password !== confirmPassword) {
      setError("Password and Confirmed Password do not match");
      setAuthInProgress(false);
    } else {
      try {
        const userObj = {
          username: email,
          password,
          attributes: {
            email,
            name,
          },
        };
        const signUpUser = await Auth.signUp(userObj);
        const user = await formatAuthUser(signUpUser, userObj);
        setAuthStatus(user);
        // console.log('successfully signed up');
        // console.log('-- Created User --', signUpUser);
        const credentials = { email, password };
        await SecureStore.setItemAsync("auth", JSON.stringify(credentials));
        // console.log(' -- And stored in the SecureStore --');
        await DataStore.save(
          new Users({
            owner: signUpUser.userSub,
            name,
            email,
          })
        );
        // console.log('-- And saved in the DataStore --', userDb);
        closeModal();
      } catch (err) {
        console.log("error signing up...", err);
        setError("There was an error creating your account");
        setAuthInProgress(false);
      }
    }
  };

  const logoutPressHandler = async () => {
    try {
      await Auth.signOut();
      await SecureStore.deleteItemAsync("auth");
      await setAuthStatus(unauthedUser);
      closeModal();
    } catch (err) {
      console.log("error signing out...", err);
      setError("There was an error signing out");
    }
  };

  const sendResetPasswordLink = async () => {
    setAuthInProgress(true);
    // Send confirmation code to user's email
    try {
      await Auth.forgotPassword(email);
      changeViews("updatePassword");
    } catch (err) {
      console.log(err);
      setError("There is no account associated with this email.");
    }
    setAuthInProgress(false);
  };

  const updatePassword = async () => {
    setAuthInProgress(true);
    // Collect confirmation code and new password,
    if (confirmNewPassword === newPassword) {
      try {
        await Auth.forgotPasswordSubmit(email, forgetPWCode, newPassword);
        processSignIn(newPassword);
        closeModal();
      } catch (err) {
        console.log(err);
        setError(
          "Password must be minimum 8 characters and must contain numbers, letters, & special characters"
        );
        setAuthInProgress(false);
      }
    } else {
      setError("Passwords do not match");
      setAuthInProgress(false);
    }
  };

  const changeViews = (newView) => {
    setError("");
    setCurrentView(newView);
    setConfirmPassword("");
  };

  const goToUserPage = async () => {
    closeModal();
    navigation.push("User", {
      userId: authStatus.id,
      name: authStatus.name,
      picture: authStatus.picture,
    });
  };

  const ref_loginPassword = useRef();
  const ref_createName = useRef();
  const ref_createPassword = useRef();
  const ref_createPasswordConfirm = useRef();
  const ref_updatePassword = useRef();
  const ref_updatePasswordConfirm = useRef();

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
              textSize="L"
            />
          ) : (
            <Icon
              name="user"
              color={colors.white}
              iconSize={typography.fontSizeXXL}
            />
          )}
        </View>
      </Pressable>
      <Modal
        visible={showModal}
        onRequestClose={closeModal}
        avoidKeyboard={true}
        style={{ padding: 0, margin: 0 }}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <Button
                  variant="secondary"
                  text="Cancel"
                  onPress={closeModal}
                  size="small"
                />
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text color={colors.white} bold size="M">
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
                    text="Logout"
                    variant="primary"
                    onPress={logoutPressHandler}
                    disabled={authInProgress}
                  />
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
                    Login to post, comment, and like
                  </Text>
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="next"
                    placeholder="Email Address"
                    value={email}
                    placeholderTextColor={colors.textInputPlaceholder}
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
                    placeholder="Password"
                    autoCompleteType="password"
                    clearButtonMode="while-editing"
                    enablesReturnKeyAutomatically={true}
                    maxLength={50}
                    placeholderTextColor={colors.textInputPlaceholder}
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
                  {error !== "" && (
                    <Text
                      color="red"
                      style={{ marginTop: 10, marginBottom: 10 }}
                    >
                      {error}
                    </Text>
                  )}
                  <Button
                    text="Login"
                    variant="primary"
                    onPress={() => processSignIn(password)}
                    disabled={authInProgress}
                  />
                  <View style={{ marginTop: 10 }}>
                    <Button
                      text="Forgot Password?"
                      variant="primary"
                      onPress={() => changeViews("forgotPassword")}
                      disabled={authInProgress}
                    />
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <Button
                      text="Create New Account"
                      variant="secondary"
                      onPress={() => changeViews("create")}
                    />
                  </View>
                </View>
              )}
              {!authStatus.isAuthed && currentView === "create" && (
                <View style={styles.modalContentWrapper}>
                  <Text bold style={{ marginBottom: 10 }}>
                    Create a new account to post, comment, and like
                  </Text>
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="next"
                    placeholder="Email Address"
                    value={email}
                    placeholderTextColor={colors.textInputPlaceholder}
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
                    placeholder="Name"
                    value={name}
                    autoCapitalize="words"
                    placeholderTextColor={colors.textInputPlaceholder}
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
                    placeholder="Password"
                    autoCompleteType="password"
                    clearButtonMode="while-editing"
                    enablesReturnKeyAutomatically={true}
                    maxLength={50}
                    placeholderTextColor={colors.textInputPlaceholder}
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
                    autoCompleteType="password"
                    clearButtonMode="while-editing"
                    enablesReturnKeyAutomatically={true}
                    maxLength={50}
                    placeholderTextColor={colors.textInputPlaceholder}
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
                  {error !== "" && (
                    <Text style={{ marginTop: 10, marginBottom: 10 }}>
                      {error}
                    </Text>
                  )}
                  <Button
                    text="Create Account"
                    variant="primary"
                    onPress={processCreateAccount}
                    disabled={authInProgress}
                  />
                  <View style={{ marginTop: 10 }}>
                    <Button
                      text="Login to Existing Account"
                      variant="secondary"
                      onPress={() => changeViews("login")}
                    />
                  </View>
                </View>
              )}
              {!authStatus.isAuthed && currentView === "forgotPassword" && (
                <View style={{ padding: 10, alignItems: "center" }}>
                  <Text bold style={{ marginBottom: 10 }}>
                    Enter your email address and we'll send you a verification
                    code to reset your password.
                  </Text>
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="go"
                    placeholder="Email Address"
                    value={email}
                    placeholderTextColor={colors.textInputPlaceholder}
                    enablesReturnKeyAutomatically={true}
                    autoCompleteType="email"
                    textContentType="emailAddress"
                    keyboardType='email-address'
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    onChangeText={(text) => setEmail(text)}
                    onSubmitEditing={sendResetPasswordLink}
                  />
                  {error !== "" && (
                    <Text
                      color="red"
                      style={{ marginTop: 10, marginBottom: 10 }}
                    >
                      {error}
                    </Text>
                  )}
                  <Button
                    text="Send Verification Code"
                    variant="primary"
                    onPress={sendResetPasswordLink}
                    disabled={authInProgress}
                  />
                  <View style={{ marginTop: 10 }}>
                    <Button
                      text="Back to Login"
                      variant="primary"
                      onPress={() => changeViews("login")}
                      disabled={authInProgress}
                    />
                  </View>
                </View>
              )}
              {!authStatus.isAuthed && currentView === "updatePassword" && (
                <View style={{ padding: 10, alignItems: "center" }}>
                  <Text bold style={{ marginBottom: 10 }}>
                    Enter your code from email.
                  </Text>
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="next"
                    placeholder="Enter Verification Code"
                    value={forgetPWCode}
                    placeholderTextColor={colors.textInputPlaceholder}
                    enablesReturnKeyAutomatically={true}
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    onChangeText={(text) => setForgetPWCode(text)}
                    onSubmitEditing={() => ref_updatePassword.current.focus()}
                  />
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="next"
                    placeholder="Enter New Password"
                    placeholderTextColor={colors.textInputPlaceholder}
                    enablesReturnKeyAutomatically={true}
                    autoCompleteType="password"
                    secureTextEntry={true}
                    textContentType="newPassword"
                    value={newPassword}
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    onChangeText={(text) => setNewPassword(text)}
                    onSubmitEditing={() => ref_updatePasswordConfirm.current.focus()}
                    ref={ref_updatePassword}
                  />
                  <TextInput
                    clearButtonMode="while-editing"
                    maxLength={50}
                    returnKeyType="go"
                    placeholder="Confirm New Password"
                    placeholderTextColor={colors.textInputPlaceholder}
                    enablesReturnKeyAutomatically={true}
                    autoCompleteType="password-new"
                    secureTextEntry={true}
                    textContentType="confirmNewPassword"
                    value={confirmNewPassword}
                    style={[
                      styles.textInput,
                      styles.modalTextInput,
                      styles.textInputWrapper,
                    ]}
                    onChangeText={(text) => setConfirmNewPassword(text)}
                    onSubmitEditing={updatePassword}
                    ref={ref_updatePasswordConfirm}
                  />
                  {error !== "" && (
                    <Text
                      color="red"
                      style={{ marginTop: 10, marginBottom: 10 }}
                    >
                      {error}
                    </Text>
                  )}
                  <Button
                    text="Change Password"
                    variant="primary"
                    onPress={updatePassword}
                    disabled={authInProgress}
                  />
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
