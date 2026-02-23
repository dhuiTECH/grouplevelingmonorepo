import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';

interface SpriteSheetAnimatorProps {
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  spriteSheet: ReturnType<typeof require>;
  fps?: number;
}

const SpriteSheetAnimator: React.FC<SpriteSheetAnimatorProps> = ({
  frameCount,
  frameWidth,
  frameHeight,
  spriteSheet,
  fps = 12,
}) => {
  const frame = useSharedValue(0);

  useEffect(() => {
    frame.value = withRepeat(
      withTiming(frameCount, {
        duration: (1000 / fps) * frameCount,
        easing: Easing.linear,
      }),
      -1 // Loop indefinitely
    );

    return () => cancelAnimation(frame);
  }, [frameCount, fps]);

  const animatedStyle = useAnimatedStyle(() => {
    const currentFrame = Math.floor(frame.value) % frameCount;
    const translateX = -currentFrame * frameWidth;

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={{ width: frameWidth, height: frameHeight, overflow: 'hidden' }}>
      <Animated.Image
        source={spriteSheet}
        style={[
          {
            width: frameWidth * frameCount,
            height: frameHeight,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

export default SpriteSheetAnimator;
