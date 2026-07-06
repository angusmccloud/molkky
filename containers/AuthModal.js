import React, { useState, useRef, useContext, useEffect } from "react";
import { View, Pressable, ScrollView, Linking } from "react-native";
import { useTheme } from "react-native-paper";
import { router } from "expo-router";
import * as AppleAuthentication from 'expo-apple-authentication';
import { getGoogleSignIn } from '@/lib/googleSignIn';
import { isAppleSignInAvailable, isGoogleSignInAvailable } from '@/services/auth';
import { exportUserData } from '@/services/dataExport';
import { PurchaseContext } from '@/contexts/PurchaseContext';

import { PRIVACY_POLICY_URL } from '@/constants/support';
import typography from '@/constants/Typography';
import Icon from '@/components/Icon';
import Text from '@/components/Text';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import Avatar from '@/components/Avatar';
import TextInput from '@/components/TextInput';
import { AuthContext } from '@/contexts/AuthContext';
import useStyles from './AuthModalStyles'; // Assuming you have a styles file

/**
 * Remove Ads purchase section, shared by the signed-in view AND the
 * logged-out Login / Create Account views — purchases are tied to the
 * store account (Apple ID), not the app account, so they must not be
 * gated behind sign-in (App Store Guideline 3.1.1; signing in only adds
 * cross-device sync via the server-validated cloud claim).
 *
 * Purchase state comes straight from PurchaseContext; the buy/restore
 * handlers come from the parent so it can clear its own form messages first.
 */
const RemoveAdsSection = ({ authInProgress, onBuy, onRestore, showSignInNote }) => {
  const theme = useTheme();
  const {
    adsRemoved,
    iapConnected,
    removeAdsPrice,
    purchaseError,
    restoreMessage,
    purchasing,
    restoring,
  } = useContext(PurchaseContext);

  return (
    <>
      {adsRemoved ? (
        <View style={{ paddingTop: 20, alignItems: "center" }}>
          <Text size="S">Ads removed — thank you!</Text>
        </View>
      ) : (
        <>
          <View style={{ paddingTop: 20 }}>
            <Button
              variant="secondary"
              onPress={onBuy}
              disabled={
                authInProgress || !iapConnected || purchasing || restoring
              }
            >
              {/* Always the store's localized price — never hardcoded. */}
              {removeAdsPrice
                ? `Remove Ads – ${removeAdsPrice}`
                : "Remove Ads"}
            </Button>
          </View>
          <View style={{ paddingTop: 10 }}>
            <Button
              variant="secondary"
              onPress={onRestore}
              disabled={
                authInProgress || !iapConnected || purchasing || restoring
              }
            >
              {restoring ? "Restoring..." : "Restore Purchases"}
            </Button>
          </View>
          {!iapConnected && (
            <View style={{ paddingTop: 10, alignItems: "center" }}>
              <Text
                size="S"
                color={theme.colors.onSurfaceVariant}
                style={{ textAlign: "center" }}
              >
                The App Store is currently unreachable. Purchases will be
                available when connection is restored.
              </Text>
            </View>
          )}
          {showSignInNote && (
            <View style={{ paddingTop: 10, alignItems: "center" }}>
              <Text
                size="S"
                color={theme.colors.onSurfaceVariant}
                style={{ textAlign: "center" }}
              >
                Purchases are tied to your Apple ID. Sign in to sync ad-free
                across devices.
              </Text>
            </View>
          )}
        </>
      )}
      {/* Purchase failures/outcomes arrive asynchronously via the store
          callbacks in PurchaseContext, hence reading the context directly. */}
      {!!purchaseError && (
        <Text color={theme.colors.error} style={{ marginTop: 10 }}>
          {purchaseError}
        </Text>
      )}
      {!!restoreMessage && (
        <Text style={{ marginTop: 10, textAlign: "center" }}>
          {restoreMessage}
        </Text>
      )}
    </>
  );
};

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
  const [appleAvailable, setAppleAvailable] = useState(false);

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
    signInWithApple,
    signInWithGoogle,
    linkApple,
    linkGoogle,
    resendVerificationEmail,
    signOut,
    sendPasswordReset,
    deleteAccount,
  } = authContext;

  // Remove-ads purchase actions. The provider always exists (mounted in
  // app/_layout.tsx) and works without auth; the purchase UI itself lives in
  // RemoveAdsSection (rendered in the signed-in, Login, AND Create Account
  // views — purchases must not require an app account).
  const { buyRemoveAds, restorePurchases, clearPurchaseMessages } =
    useContext(PurchaseContext);

  useEffect(() => {
    let mounted = true;
    isAppleSignInAvailable().then((available) => {
      if (mounted) setAppleAvailable(available);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const authStatus = {
    isAuthed: isAuthenticated,
    // Apple accounts have no providerData displayName/email until the profile
    // update lands, so fall back to the top-level firebase user fields.
    name: user?.providerData?.[0]?.displayName || user?.displayName || '',
    email: user?.providerData?.[0]?.email || user?.email || '',
  };

  // Social-only accounts have no password to type into the delete-confirmation
  // box — they confirm by re-running their provider's native sign-in instead.
  // Must mirror the provider precedence in AuthContext.deleteAccount.
  const hasPasswordProvider = !!user?.providerData?.some(
    (p) => p.providerId === 'password',
  );
  const hasAppleLinked = !!user?.providerData?.some(
    (p) => p.providerId === 'apple.com',
  );
  const hasGoogleLinked = !!user?.providerData?.some(
    (p) => p.providerId === 'google.com',
  );
  const socialProviderName = hasAppleLinked ? 'Apple' : 'Google';

  // Google availability is synchronous (a config + module check); Apple needs
  // a native round-trip, hence the state + effect above. The button component
  // comes from the same lazy loader — a static import would crash binaries
  // that don't include the native module (see lib/googleSignIn.ts).
  const googleAvailable = isGoogleSignInAvailable();
  const GoogleSigninButton = googleAvailable
    ? getGoogleSignIn()?.GoogleSigninButton
    : null;

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
    clearPurchaseMessages();
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
      if (signInSuccessful) {
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

  const processAppleSignIn = async () => {
    setFormError("");
    setAuthInProgress(true);
    try {
      await signInWithApple();
      closeModal();
    } catch (err) {
      setAuthInProgress(false);
      const code = err?.code;
      if (code === 'ERR_REQUEST_CANCELED') {
        // User dismissed the Apple sheet — not an error.
        return;
      }
      console.log(" -- Apple sign-in failed --", code);
      if (code === "auth/operation-not-allowed") {
        setFormError("Sign in with Apple is currently disabled");
      } else if (code === "auth/too-many-requests") {
        setFormError("Too many attempts. Please try again later.");
      } else {
        setFormError("There was an error signing in with Apple, please try again");
      }
    }
  };

  const processGoogleSignIn = async () => {
    setFormError("");
    setAuthInProgress(true);
    try {
      await signInWithGoogle();
      closeModal();
    } catch (err) {
      setAuthInProgress(false);
      const code = err?.code;
      if (code === 'ERR_REQUEST_CANCELED') {
        // User dismissed the account picker — not an error.
        return;
      }
      console.log(" -- Google sign-in failed --", code);
      if (code === "auth/operation-not-allowed") {
        setFormError("Sign in with Google is currently disabled");
      } else if (code === "auth/too-many-requests") {
        setFormError("Too many attempts. Please try again later.");
      } else {
        setFormError("There was an error signing in with Google, please try again");
      }
    }
  };

  const linkErrorMessage = (err, providerName) => {
    const code = err?.code;
    if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
      return `That ${providerName} account is already linked to a different user`;
    }
    if (code === "auth/provider-already-linked") {
      return `A ${providerName} account is already linked to this account`;
    }
    if (code === "auth/requires-recent-login") {
      return "Please log out and back in, then try linking again";
    }
    return `Couldn't link ${providerName} sign-in, please try again`;
  };

  const processLinkApple = async () => {
    setFormError("");
    setInfoMessage("");
    setAuthInProgress(true);
    try {
      await linkApple();
      setInfoMessage("Apple sign-in linked — you can now log in either way.");
    } catch (err) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setFormError(linkErrorMessage(err, "Apple"));
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  const processLinkGoogle = async () => {
    setFormError("");
    setInfoMessage("");
    setAuthInProgress(true);
    try {
      await linkGoogle();
      setInfoMessage("Google sign-in linked — you can now log in either way.");
    } catch (err) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        setFormError(linkErrorMessage(err, "Google"));
      }
    } finally {
      setAuthInProgress(false);
    }
  };

  const processResendVerification = async () => {
    setFormError("");
    setInfoMessage("");
    setAuthInProgress(true);
    try {
      await resendVerificationEmail();
      setInfoMessage("Verification email sent — check your inbox.");
    } catch (err) {
      if (err?.code === "auth/too-many-requests") {
        setFormError("Too many attempts. Please try again later.");
      } else {
        setFormError("Couldn't send the verification email, please try again");
      }
    } finally {
      setAuthInProgress(false);
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
    if (hasPasswordProvider && password.length === 0) {
      setFormError("Enter your password to confirm");
      setAuthInProgress(false);
      return;
    }
    try {
      // Apple-only accounts confirm via a fresh Apple sign-in sheet (shown by
      // deleteAccount) instead of a password.
      await deleteAccount(hasPasswordProvider ? password : undefined);
      closeModal();
    } catch (err) {
      const code = err?.code;
      if (code === 'ERR_REQUEST_CANCELED') {
        // User dismissed the Apple confirmation sheet — nothing was deleted.
        setFormError("");
      } else if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
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

  // Purchase results arrive via the PurchaseContext callbacks, so these
  // handlers only clear stale messages and kick the flow off — errors and
  // restore outcomes surface through purchaseError/restoreMessage below.
  const handleBuyRemoveAds = () => {
    setFormError("");
    setInfoMessage("");
    void buyRemoveAds();
  };

  const handleRestorePurchases = () => {
    setFormError("");
    setInfoMessage("");
    void restorePurchases();
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
                <RemoveAdsSection
                  authInProgress={authInProgress}
                  onBuy={handleBuyRemoveAds}
                  onRestore={handleRestorePurchases}
                />
                {((appleAvailable && !hasAppleLinked) ||
                  (googleAvailable && !hasGoogleLinked)) && (
                  <View style={{ paddingTop: 20, alignItems: "center" }}>
                    <Text size="S" style={{ marginBottom: 10 }}>
                      Add another way to log in:
                    </Text>
                    {appleAvailable && !hasAppleLinked && (
                      <Button
                        variant="secondary"
                        onPress={processLinkApple}
                        disabled={authInProgress}
                      >
                        Link Apple Sign-In
                      </Button>
                    )}
                    {googleAvailable && !hasGoogleLinked && (
                      <View
                        style={{
                          paddingTop: appleAvailable && !hasAppleLinked ? 10 : 0,
                        }}
                      >
                        <Button
                          variant="secondary"
                          onPress={processLinkGoogle}
                          disabled={authInProgress}
                        >
                          Link Google Sign-In
                        </Button>
                      </View>
                    )}
                  </View>
                )}
                {hasPasswordProvider && user?.emailVerified === false && (
                  <View style={{ paddingTop: 20, alignItems: "center" }}>
                    <Text size="S" style={{ textAlign: "center", marginBottom: 10 }}>
                      Your email address isn&apos;t verified. Verifying it keeps
                      password login working even after you sign in with Apple
                      or Google.
                    </Text>
                    <Button
                      variant="secondary"
                      onPress={processResendVerification}
                      disabled={authInProgress}
                    >
                      Resend Verification Email
                    </Button>
                  </View>
                )}
                {/* Purchase failures/outcomes render inside RemoveAdsSection
                    above; these rows carry the auth form's own messages. */}
                {formError !== "" && (
                  <Text color={theme.colors.error} style={{ marginTop: 10 }}>
                    {formError}
                  </Text>
                )}
                {infoMessage !== "" && (
                  <Text style={{ marginTop: 10, textAlign: "center" }}>
                    {infoMessage}
                  </Text>
                )}
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
                  {hasPasswordProvider
                    ? "This permanently deletes your account and all of your games from the cloud. This cannot be undone. Enter your password to confirm."
                    : `This permanently deletes your account and all of your games from the cloud. This cannot be undone. You'll be asked to sign in with ${socialProviderName} again to confirm.`}
                </Text>
                {hasPasswordProvider && (
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
                )}
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
                {(appleAvailable || googleAvailable) && (
                  <Text size="S" style={{ marginTop: 10 }}>or</Text>
                )}
                {appleAvailable && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    }
                    buttonStyle={
                      theme.dark
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={22}
                    style={{ width: 240, height: 44, marginTop: 10 }}
                    onPress={authInProgress ? () => {} : processAppleSignIn}
                  />
                )}
                {!!GoogleSigninButton && (
                  <GoogleSigninButton
                    size={GoogleSigninButton.Size.Wide}
                    color={
                      theme.dark
                        ? GoogleSigninButton.Color.Light
                        : GoogleSigninButton.Color.Dark
                    }
                    disabled={authInProgress}
                    onPress={processGoogleSignIn}
                    style={{ width: 240, height: 48, marginTop: 10 }}
                  />
                )}
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
                <RemoveAdsSection
                  authInProgress={authInProgress}
                  onBuy={handleBuyRemoveAds}
                  onRestore={handleRestorePurchases}
                  showSignInNote
                />
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
                {(appleAvailable || googleAvailable) && (
                  <View style={{ alignItems: "center" }}>
                    <Text size="S" style={{ marginTop: 10 }}>or</Text>
                    {appleAvailable && (
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={
                          AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                        }
                        buttonStyle={
                          theme.dark
                            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                        }
                        cornerRadius={22}
                        style={{ width: 240, height: 44, marginTop: 10 }}
                        onPress={authInProgress ? () => {} : processAppleSignIn}
                      />
                    )}
                    {!!GoogleSigninButton && (
                      <GoogleSigninButton
                        size={GoogleSigninButton.Size.Wide}
                        color={
                          theme.dark
                            ? GoogleSigninButton.Color.Light
                            : GoogleSigninButton.Color.Dark
                        }
                        disabled={authInProgress}
                        onPress={processGoogleSignIn}
                        style={{ width: 240, height: 48, marginTop: 10 }}
                      />
                    )}
                  </View>
                )}
                <View style={{ marginTop: 10, marginBottom: 10 }}>
                  <Button
                    variant="secondary"
                    onPress={() => changeViews("login")}
                  >
                    Login to Existing Account
                  </Button>
                </View>
                <RemoveAdsSection
                  authInProgress={authInProgress}
                  onBuy={handleBuyRemoveAds}
                  onRestore={handleRestorePurchases}
                  showSignInNote
                />
              </View>
            )}
            {/* Always-visible footer — the privacy policy and a support/contact
                link must be reachable from inside the app (App Store / Play
                requirement) regardless of auth state or which sub-view is
                showing. */}
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
            <Pressable
              onPress={() => {
                closeModal();
                router.push("/contact");
              }}
              style={{ paddingBottom: 16, alignItems: "center" }}
              accessibilityRole="link"
              accessibilityLabel="Open the contact us form"
            >
              <Text size="S" color={theme.colors.primary}>
                Contact / Support
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default AuthModal;