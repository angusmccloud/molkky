import { Dimensions } from "react-native";

const useDeviceDimensions = () => {
  // const statusBarHeight = 0; // getStatusBarHeight(false); // Removed library react-native-status-bar-height
  const dim = Dimensions.get("window")
  const { width, height } = dim;
  // const visibileHeight = height - statusBarHeight;
  const orientation = width > height ? "landscape" : "portrait";
  return {
    width,
    height,
    orientation,
    isTablet: width >= 768,
    // visibileHeight,
  };
};

export default useDeviceDimensions;
