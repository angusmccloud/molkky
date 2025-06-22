import React, { useMemo } from "react"
import { ReactNativeModal as RNModal, ModalProps } from "react-native-modal";
import {
  useTheme,
} from "react-native-paper";

const Modal = (props: ModalProps) => {
  const theme = useTheme();
  const {
    backdropColor = 'rgba(52, 52, 52, 0.8)',
    backdropOpacity = 1,
    ...restOfProps
  } = props;
  return (
    <RNModal {...restOfProps} backdropColor={backdropColor} backdropOpacity={backdropOpacity} />
  )
};

export default Modal;