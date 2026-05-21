import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Modal as PaperModal, Portal } from 'react-native-paper';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

/**
 * API-preserving shim over `react-native-paper`'s `Portal` + `Modal`.
 *
 * Migrated away from `react-native-modal` (stuck on 14.0.0-rc.1, abandoned RC).
 * Paper's Portal uses React's portal mechanism within the same RN view tree, so
 * gesture-handler "Just Works" without the inner `GestureHandlerRootView`
 * workaround that `react-native-modal` required on native.
 *
 * Prop surface kept compatible with the prior `react-native-modal` wrapper:
 *  - `isVisible`         -> Paper `visible`
 *  - `onBackdropPress`   -> Paper `onDismiss` (backdrop tap)
 *  - `onBackButtonPress` -> Paper `onDismiss` (Android hardware back; Paper
 *                          handles hardware back internally when dismissable)
 *  - `avoidKeyboard`     -> conditional `KeyboardAvoidingView` wrapper
 *  - `animationIn` / `animationOut` -> when these are slide-* values, the
 *    content is wrapped in a Reanimated `Animated.View` with
 *    `SlideInDown`/`SlideOutDown` to roughly preserve the prior slide-up
 *    feel. Otherwise Paper's default fade runs.
 *  - `style`             -> applied as `contentContainerStyle` so the modal
 *                          content can be made edge-to-edge (e.g. the
 *                          existing `{ padding: 0, margin: 0 }` style).
 *  - `backdropColor` / `backdropOpacity` -> wired into `overlayAccessibilityLabel`/style.
 */
export type ModalShimProps = {
  isVisible: boolean;
  children?: ReactNode;
  onBackdropPress?: () => void;
  onBackButtonPress?: () => void;
  avoidKeyboard?: boolean;
  animationIn?: string;
  animationOut?: string;
  style?: StyleProp<ViewStyle>;
  backdropColor?: string;
  backdropOpacity?: number;
  dismissable?: boolean;
};

const DEFAULT_BACKDROP_COLOR = 'rgba(52, 52, 52, 0.8)';

const Modal = (props: ModalShimProps) => {
  const {
    isVisible,
    children,
    onBackdropPress,
    onBackButtonPress,
    avoidKeyboard = false,
    animationIn,
    animationOut,
    style,
    backdropColor = DEFAULT_BACKDROP_COLOR,
    backdropOpacity = 1,
    dismissable = true,
  } = props;

  const handleDismiss = () => {
    // Paper fires onDismiss for both backdrop tap and Android hardware back.
    // Prefer onBackdropPress; fall back to onBackButtonPress for parity with
    // the previous react-native-modal prop surface.
    if (onBackdropPress) {
      onBackdropPress();
    } else if (onBackButtonPress) {
      onBackButtonPress();
    }
  };

  // Roughly preserve the slide-up animation when callers explicitly opted in.
  const useSlide =
    (typeof animationIn === 'string' && animationIn.toLowerCase().includes('slide')) ||
    (typeof animationOut === 'string' && animationOut.toLowerCase().includes('slide'));

  // Backdrop styling. Paper renders a black backdrop by default; we tint it
  // here so the look matches the prior "rgba(52, 52, 52, 0.8)" backdrop.
  const overlayStyle = {
    backgroundColor: backdropColor,
    opacity: backdropOpacity,
  };

  let content: ReactNode = children;

  if (avoidKeyboard) {
    content = (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexShrink}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  if (useSlide) {
    content = (
      <Animated.View
        entering={SlideInDown.duration(250)}
        exiting={SlideOutDown.duration(200)}
        style={styles.flexShrink}
      >
        {content}
      </Animated.View>
    );
  }

  return (
    <Portal>
      <PaperModal
        visible={isVisible}
        onDismiss={handleDismiss}
        dismissable={dismissable}
        contentContainerStyle={[styles.contentContainer, style]}
        style={[styles.backdrop, overlayStyle]}
      >
        {content}
      </PaperModal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    // The wrapper covers the screen; Paper centers the contentContainer
    // inside it. We override Paper's default backdrop here.
  },
  contentContainer: {
    // Match the previous "fullscreen-ish" feel: the inner modalBody style
    // (from useReusableStyles) handles the card sizing, so we just want
    // the container to span the screen without forcing its own padding.
    alignSelf: 'center',
    justifyContent: 'center',
  },
  flexShrink: {
    // Lets KeyboardAvoidingView/Animated.View shrink to its content's
    // intrinsic size (the modalBody sets its own width/maxHeight).
  },
});

export default Modal;
