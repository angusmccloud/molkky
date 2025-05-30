import React, { useMemo } from "react"
import { ReactNativeModal as RNModal, ModalProps } from "react-native-modal";
import {
  useTheme,
} from "react-native-paper";

const Modal = (props: ModalProps) => {
  const theme = useTheme();
  return (
    <RNModal {...props} backdropColor={theme.colors.modalBackground} />
  )
};

export default Modal;