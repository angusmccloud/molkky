import React from "react"
import RNModal from "react-native-modal";

// TO-DO: Import both React-Native Modal and OOTB Modal
// Export OOTB Modal for RN for Web, React-Native-Modal for apps
const Modal = (props) => {
  return (
    <RNModal {...props} />
  )
};

export default Modal;