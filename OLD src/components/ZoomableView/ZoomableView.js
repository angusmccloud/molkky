import React, { useRef, useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { PinchGestureHandler, TapGestureHandler, PanGestureHandler, State, } from 'react-native-gesture-handler';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withTiming, } from 'react-native-reanimated';
import styles from './ZoomableViewStyles';

const { height, width } = Dimensions.get('window');

const ZoomableView = ({ children, onPress, maxZoom = 3 }) =>{
	const [size, setSize] = useState({ height: height, width: width }); const [enablePan, setEnablePan] = useState(false);

	const doubleTapRef = useRef(null);

	const originIsSet = useSharedValue(false); // This is used by android, set the "onStart" event doesnt have a focal value yet

	const scale = useSharedValue(1);
	const scaleOffset = useSharedValue(1);

	const focalX = useSharedValue(0);
	const focalY = useSharedValue(0);
	const originX = useSharedValue(0);
	const originY = useSharedValue(0);

	const pinchX = useSharedValue(0);
	const pinchY = useSharedValue(0);

	const offsetX = useSharedValue(0);
	const offsetY = useSharedValue(0);

	const translationX = useSharedValue(0);
	const translationY = useSharedValue(0);

	const onPinch = useAnimatedGestureHandler({
		onStart: event => {
			if (Platform.OS === 'ios') {
				originIsSet.value = true;
			}

			originX.value = event.focalX - (size.width / 2 + offsetX.value);
			originY.value = event.focalY - (size.height / 2 + offsetY.value);
		},
		onActive: event => {
			if (Platform.OS === 'android' && !originIsSet.value) {
				originIsSet.value = true;

				originX.value = event.focalX - (size.width / 2 + offsetX.value);
				originY.value = event.focalY - (size.height / 2 + offsetY.value);
			}

			scale.value = event.scale;
			focalX.value = event.focalX;
			focalY.value = event.focalY;

			translationX.value =
				pinchX.value + originX.value + -originX.value * scale.value;
			translationY.value =
				pinchY.value + originY.value + -originY.value * scale.value;

			const adjustedFocalX = event.focalX - (size.width / 2 + offsetX.value);
			const adjustedFocalY = event.focalY - (size.height / 2 + offsetY.value);

			if (event.numberOfPointers === 2) {
				pinchX.value = adjustedFocalX - originX.value;
				pinchY.value = adjustedFocalY - originY.value;
			}
		},
		onEnd: event => {
			offsetX.value = offsetX.value + translationX.value;
			offsetY.value = offsetY.value + translationY.value;

			if (scaleOffset.value * event.scale > maxZoom) {
				scaleOffset.value = maxZoom;
				scale.value = 1;
			} else if (scaleOffset.value * event.scale < 1) {
				scaleOffset.value = withTiming(1);
				offsetX.value = withTiming(0);
				offsetY.value = withTiming(0);
				scale.value = withTiming(1);
			} else {
				scaleOffset.value *= event.scale;
				scale.value = 1;
			}

			translationX.value = 0;
			translationY.value = 0;
			focalX.value = 0;
			focalY.value = 0;
			pinchX.value = 0;
			pinchY.value = 0;
			originIsSet.value = false;
		},
	});

	const onPinchStateChange = ({ nativeEvent }) => {
		if (nativeEvent.state === State.END) {
			if (scaleOffset.value * scale.value > 1) {
				setEnablePan(true);
			} else {
				setEnablePan(false);
			}
		}
	};

	const onPan = useAnimatedGestureHandler({
		onActive: event => {
			if (scaleOffset.value * scale.value <= 1) {
				return;
			}

			translationX.value =
				event.translationX + originX.value + -originX.value * scale.value;
			translationY.value =
				event.translationY + originY.value + -originY.value * scale.value;
		},
		onEnd: () => {
			offsetX.value = offsetX.value + translationX.value;
			offsetY.value = offsetY.value + translationY.value;

			translationX.value = 0;
			translationY.value = 0;
		},
	});

	const onSingleTap = () => {
		onPress && onPress();
	};

	const onDoubleTap = event => {
		if (scaleOffset.value * scale.value === 1) {
			// if not zoomed in, zoon in on double tap
			scaleOffset.value = withTiming(2);
			offsetX.value = withTiming((event.nativeEvent.x - size.width / 2) * -1);
			offsetY.value = withTiming((event.nativeEvent.y - size.height / 2) * -1);
			scale.value = withTiming(1);

			setEnablePan(true);
		} else {
			// if already zoomed in, zoom out on double tap
			scaleOffset.value = withTiming(1);
			offsetX.value = withTiming(0);
			offsetY.value = withTiming(0);
			scale.value = withTiming(1);

			setEnablePan(false);
		}
	};

	const animatedStyle = useAnimatedStyle(() => {
		const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

		return {
			transform: [
				{
					translateX: offsetX.value + translationX.value,
				},
				{
					translateY: offsetY.value + translationY.value,
				},
				{ scale: clamp(scaleOffset.value * scale.value, 0, maxZoom) },
			],
		};
	});

	return (
		<TapGestureHandler onActivated={onSingleTap} waitFor={doubleTapRef}>
			<TapGestureHandler
				numberOfTaps={2}
				onActivated={onDoubleTap}
				ref={doubleTapRef}
				maxDelayMs={200}
			>
				<Animated.View
					onLayout={({ nativeEvent }) =>
						setSize({
							height: nativeEvent.layout.height,
							width: nativeEvent.layout.width,
						})
					}
				>
					<PanGestureHandler onGestureEvent={onPan} enabled={enablePan}>
						<Animated.View style={styles.zoomViewWrapper}>
							<PinchGestureHandler
								onGestureEvent={onPinch}
								onHandlerStateChange={onPinchStateChange}
							>
								<Animated.View style={styles.zoomContentWrapper}>
									<Animated.View style={[animatedStyle, styles.zoomContentWrapper]}>
										{children}
									</Animated.View>
								</Animated.View>
							</PinchGestureHandler>
						</Animated.View>
					</PanGestureHandler>
				</Animated.View>
			</TapGestureHandler>
		</TapGestureHandler>
	);
}

export default ZoomableView;