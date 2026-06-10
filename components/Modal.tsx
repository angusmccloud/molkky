import React, { ReactNode, useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { Modal as PaperModal, Portal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * API-preserving shim over `react-native-paper`'s `Portal` + `Modal`.
 *
 * Migrated away from `react-native-modal` (stuck on 14.0.0-rc.1, abandoned RC).
 *
 * Sizing: Paper renders `children` inside a `<Surface container>`, whose inner
 * layer deliberately drops `flex` unless an explicit `height` is set (see
 * `Surface.tsx`: `flex: flattenedStyles.height || (!container && flex) ? 1 :
 * undefined`). A `flex: 1` content container therefore collapses to zero
 * height and every `flex: 1` child (KeyboardAvoidingView, the card) renders at
 * 0px — a visible backdrop with no content. We instead size the wrapper to the
 * available screen area (window height minus the safe-area insets that Paper
 * already reserves as wrapper margins) so flex children have real room.
 *
 * Keyboard handling: when `avoidKeyboard` is set, the shim does two things:
 *   1. Wraps content in a full-height `KeyboardAvoidingView` so
 *      `behavior="padding"`/`"height"` actually has room to push content up.
 *   2. Subscribes to keyboard events and caps the inner wrapper's `maxHeight`
 *      so a tall modal shrinks to fit the visible area above the keyboard
 *      instead of clipping off the top of the screen. The inner `ScrollView`
 *      that each modal already renders takes care of the overflow.
 *
 * For the shrink-to-fit to take effect, the rendered content (typically a
 * `modalBody`-styled card) needs `flexShrink: 1` — see `useReusableStyles`.
 *
 * Note: `animationIn`/`animationOut` are accepted for backwards compatibility
 * but are no-ops. The previous implementation used Reanimated layout
 * animations (`SlideInDown`), which don't reliably fire inside Paper's Portal
 * on the New Architecture and leave content frozen at the off-screen initial
 * frame. The entrance is Paper's built-in opacity fade.
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
const KEYBOARD_BOTTOM_MARGIN = 16;

const Modal = (props: ModalShimProps) => {
  const {
    isVisible,
    children,
    onBackdropPress,
    onBackButtonPress,
    avoidKeyboard = false,
    style,
    backdropColor = DEFAULT_BACKDROP_COLOR,
    backdropOpacity = 1,
    dismissable = true,
  } = props;

  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Paper's Modal wrapper already reserves the safe-area insets as
  // marginTop/marginBottom, so the area we get to fill is the window minus
  // those insets.
  const availableHeight = Math.max(0, screenHeight - insets.top - insets.bottom);

  useEffect(() => {
    if (!avoidKeyboard) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [avoidKeyboard]);

  const handleDismiss = () => {
    if (onBackdropPress) {
      onBackdropPress();
    } else if (onBackButtonPress) {
      onBackButtonPress();
    }
  };

  const overlayStyle = {
    backgroundColor: backdropColor,
    opacity: backdropOpacity,
  };

  const heightCap: ViewStyle | null =
    avoidKeyboard && keyboardHeight > 0
      ? { maxHeight: screenHeight - keyboardHeight - KEYBOARD_BOTTOM_MARGIN }
      : null;

  let content: ReactNode = (
    <View style={[styles.shell, heightCap, style]}>{children}</View>
  );

  if (avoidKeyboard) {
    content = (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoiding}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  // Explicitly size the fill area instead of relying on `flex: 1`, which Paper's
  // `container` Surface strips (see the doc comment above).
  content = (
    <View
      style={[styles.fill, { width: screenWidth, height: availableHeight }]}
      pointerEvents="box-none"
    >
      {content}
    </View>
  );

  return (
    <Portal>
      <PaperModal
        visible={isVisible}
        onDismiss={handleDismiss}
        dismissable={dismissable}
        contentContainerStyle={styles.contentContainer}
        style={overlayStyle}
      >
        {content}
      </PaperModal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fill: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoiding: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Modal;
