import { Dimensions, useWindowDimensions } from "react-native";

export const vw = (number, baseWidth) =>
  (baseWidth || Dimensions.get("window").width) * (number / 100);

export const vh = (number, baseHeight) =>
  (baseHeight || Dimensions.get("window").height) * (number / 100);

export const vmin = (
  number,
  baseWidth,
  baseHeight
) =>
  Math.min(
    (baseWidth || Dimensions.get("window").width) * (number ? number / 100 : 1),
    (baseHeight || Dimensions.get("window").height) *
      (number ? number / 100 : 1)
  );

export const vmax = (
  number,
  baseWidth,
  baseHeight
) => {
  return Math.max(
    (baseWidth || Dimensions.get("window").width) * (number ? number / 100 : 1),
    (baseHeight || Dimensions.get("window").height) *
      (number ? number / 100 : 1)
  );
};

export const percentage = (partial, total) =>
  (total * partial) / 100;

const useDeviceDimensions = () => {
  const { width, height } = useWindowDimensions();

  return {
    vw: (number) => vw(number, width),
    vh: (number) => vh(number, height),
    vmin: (number) => vmin(number, width, height),
    vmax: (number) => vmax(number, width, height),
    percentage: (partial, total) => percentage(partial, total),
  };
};

export default useDeviceDimensions; 