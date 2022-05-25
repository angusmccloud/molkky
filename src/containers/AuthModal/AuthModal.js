import React, { useState, useRef } from 'react';
import { View, Pressable, TextInput, ScrollView } from 'react-native';
import { Auth } from 'aws-amplify';
import * as SecureStore from 'expo-secure-store';
import { Users } from '../../models';
import { colors, typography } from '../../styles';
import { Icon, Text, Button, ActivityIndicator, Modal } from '../../components';
import { checkAuthStatus, DataStore } from '../../utils/';
import styles from './AuthModalStyles';

const AuthModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const emptyAuth = { isAuthed: false, authPending: false };
  const [authStatus, setAuthStatus] = useState(emptyAuth);
  const [currentView, setCurrentView] = useState('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authInProgress, setAuthInProgress] = useState(false);
  const [error, setError] = useState('');

  const openModal = () => {
    console.log('-- Open Modal --');
    setShowModal(true);
    getAuthStatus();
  };

  const closeModal = () => {
    console.log('-- Close Modal --');
    setShowModal(false);
    setAuthInProgress(false);
    setCurrentView('login');
    setError('');
    setEmail('');
    setName('');
    setPassword('');
    setConfirmPassword('');
    setInitialLoad(true);
  };

  const processSignIn = async () => {
    console.log(' -- onSignInPress --');
    setAuthInProgress(true);
    if (email.length === 0 || password.length === 0) {
      setError('Email and Password are required');
      setAuthInProgress(false);
    }
    try {
      await Auth.signIn(email, password);
      console.log('-- Sign in Successful --');
      const credentials = {email, password};
      await SecureStore.setItemAsync('auth', JSON.stringify(credentials));
      console.log(' -- And stored in the SecureStore --');
      closeModal();
    } catch ({ code }) {
      setAuthInProgress(false);
      console.log(" -- Didn't Work --", code);
      if (code === 'UserNotConfirmedException') {
        setError('Account not verified yet');
      } else if (code === 'PasswordResetRequiredException') {
        setError('Existing user found. Please reset your password');
      } else if (code === 'NotAuthorizedException') {
        // setUserInfo(values)
        setError('Forgot Password?');
      } else if (code === 'UserNotFoundException') {
        setError('User does not exist');
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
      setError('Email, Name, Password, and Confirmed Password are required');
      setAuthInProgress(false);
    } else if (password !== confirmPassword) {
      setError('Password and Confirmed Password do not match');
      setAuthInProgress(false);
    } else {
      try {
        const userObj = {
          username: email,
          password,
          attributes: {
            email,
            name
          }
        };
        const user = await Auth.signUp(userObj);
        console.log('successfully signed up');
        console.log('-- Created User --', user);
        const credentials = {email, password};
        await SecureStore.setItemAsync('auth', JSON.stringify(credentials));
        console.log(' -- And stored in the SecureStore --');
        const userDb = await DataStore.save(
          new Users({
            owner: user.userSub,
            name,
            email,
          })
        );
        console.log('-- And saved in the DataStore --', userDb);
        closeModal();
        // TO-DO: If we add a Snackbar, add it here!
      } catch (err) {
        console.log('error signing up...', err);
        setError('There was an error creating your account');
        setAuthInProgress(false);
      }
    }
  };

  const logoutPressHandler = async () => {
    try {
      await Auth.signOut();
      console.log('successfully Signed Out');
      await SecureStore.deleteItemAsync('auth');
      console.log('And credentials removed from Secure Store');
      closeModal();
    } catch (err) {
      console.log('error signing out...', err);
      setError('There was an error signing out');
    }
  };

  const changeViews = (newView) => {
    setError('');
    setCurrentView(newView);
    setConfirmPassword('');
  };

  const getAuthStatus = async () => {
    const auth = await checkAuthStatus();
    setAuthStatus(auth);
    setInitialLoad(false);
    console.log('-- AUTH STATUS --', auth);
  };

  const ref_loginPassword = useRef();
  const ref_createName = useRef();
  const ref_createPassword = useRef();
  const ref_createPasswordConfirm = useRef();

  return (
    <>
      {!showModal ? (
        <Pressable onPress={openModal}>
          <View>
            <Icon
              name='user'
              color={colors.white}
              iconSize={typography.fontSizeXXL}
            />
          </View>
        </Pressable>
      ) : (
        <Modal
          visible={showModal}
          onRequestClose={closeModal}
          avoidKeyboard={true}
          style={{ padding: 0, margin: 0 }}
        >
          <View style={styles.modalBackground}>
            <View style={styles.modalBody}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, alignItems: 'flex-start' }}>
                  <Button
                    variant='secondary'
                    text="Cancel"
                    onPress={() => closeModal()}
                    size="small"
                  />
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text
                    color={colors.white}
                    bold
                    size="XL">
                    Login
                  </Text>
                </View>
                <View style={{ flex: 1 }}></View>
              </View>
              <ScrollView>
                {initialLoad && (
                  <View style={styles.ActivityIndicatorWrapper}>
                    <ActivityIndicator size={40} />
                  </View>
                )}
                {authStatus.isAuthed && !initialLoad && (
                  <View style={styles.logoutWrapper}>
                    <Text style={{ marginBottom: 10 }}>
                      You are currently logged in as {authStatus.name} ({authStatus.email})
                    </Text>
                    <Button
                      text="Logout"
                      variant="primary"
                      onPress={() => logoutPressHandler()}
                      disabled={authInProgress}
                    />
                  </View>
                )}
                {!authStatus.isAuthed &&
                  !initialLoad &&
                  currentView === 'login' && (
                    <View style={{ padding: 10, alignItems: 'center' }}>
                      <Text bold style={{ marginBottom: 10 }}>
                        Login to start a new game
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
                        style={[styles.textInput, styles.textInputWrapper]}
                        onChangeText={(text) => setEmail(text)}
                        onSubmitEditing={() => ref_loginPassword.current.focus()}
                      />
                      <TextInput
                        onChangeText={(text) => setPassword(text)}
                        onSubmitEditing={() => processSignIn()}
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
                        style={[styles.textInput, styles.textInputWrapper]}
                        ref={ref_loginPassword}
                      />
                      {error !== '' && (
                        <Text color='red' style={{ marginTop: 10, marginBottom: 10 }}>
                          {error}
                        </Text>
                      )}
                      <Button
                        text="Login"
                        variant="primary"
                        onPress={() => processSignIn()}
                        disabled={authInProgress}
                      />
                      <View style={{ marginTop: 10 }}>
                        <Button
                          text="Create New Account"
                          variant="secondary"
                          onPress={() => changeViews('create')}
                        />
                      </View>
                    </View>
                  )}
                {!authStatus?.isAuthed &&
                  !initialLoad &&
                  currentView === 'create' && (
                    <View style={styles.modalContentWrapper}>
                      <Text bold style={{ marginBottom: 10 }}>
                        Create an account to start your first game
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
                        style={[styles.textInput, styles.textInputWrapper]}
                        onChangeText={(text) => setEmail(text)}
                        onSubmitEditing={() => ref_createName.current.focus()}
                      />
                      <TextInput
                        clearButtonMode="while-editing"
                        maxLength={50}
                        returnKeyType="next"
                        placeholder="Name"
                        autoCapitalize='words'
                        value={name}
                        placeholderTextColor={colors.textInputPlaceholder}
                        enablesReturnKeyAutomatically={true}
                        textContentType="name"
                        style={[styles.textInput, styles.textInputWrapper]}
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
                        style={[styles.textInput, styles.textInputWrapper]}
                        ref={ref_createPassword}
                        onSubmitEditing={() => ref_createPasswordConfirm.current.focus()}
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
                        style={[styles.textInput, styles.textInputWrapper]}
                        ref={ref_createPasswordConfirm}
                      />
                      {error !== '' && (
                        <Text style={{ marginTop: 10, marginBottom: 10 }}>
                          {error}
                        </Text>
                      )}
                      <Button
                        text="Create Account"
                        variant="primary"
                        onPress={() => processCreateAccount()}
                        disabled={authInProgress}
                      />
                      <View style={{ marginTop: 10 }}>
                        <Button
                          text="Login to Existing Account"
                          variant="secondary"
                          onPress={() => changeViews('login')}
                        />
                      </View>
                    </View>
                  )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </>
  )
}

export default AuthModal;

