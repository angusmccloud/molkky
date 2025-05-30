import { Dimensions } from 'react-native';

const calcDimensions = () => {
    const statusBarHeight = 0; // getStatusBarHeight(false); // Removed library react-native-status-bar-height
    const dim = Dimensions.get('screen');
    const { width, height } = dim;
    const visibileHeight = height - statusBarHeight;
    const orientation = width > height ? 'landscape' : 'portrait';
    return {
        width,
        height,
        orientation,
        visibileHeight
    };
}

export default calcDimensions;