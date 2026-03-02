import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useFrameCallback, 
  useAnimatedStyle,
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { Image } from 'expo-image';

// Create an animated version of expo-image
const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

export const PetSprite = ({
  imageUrl,
  action = 'idle',
  idleIndex = 0,
  totalFrames = 1,
  totalTimeMs = 1000,
  frameWidth,
  frameHeight,
  scale = 1,
  flipX = false,
  onEnterComplete,
  style
}: any) => {
  const currentFrame = useSharedValue(idleIndex);
  const frameTimer = useSharedValue(0);
  const breathScale = useSharedValue(1);
  const hasEntered = useSharedValue(false);

  useEffect(() => {
    if (action === 'idle') {
      currentFrame.value = idleIndex;
      frameTimer.value = 0;
      breathScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else if (action === 'enter') {
      breathScale.value = 1;
      currentFrame.value = 0;
      frameTimer.value = 0;
      hasEntered.value = false;
    } else {
      breathScale.value = 1;
      // We don't force reset frame to 0 for walk to avoid jitter if walk is toggled rapidly,
      // but if we were idle, frame was idleIndex, so it starts from there.
    }
  }, [action, idleIndex]);

  useFrameCallback((frameInfo) => {
    if (totalFrames <= 1) return;
    if (action === 'idle') return;

    const timePerFrame = totalTimeMs / totalFrames;
    const dt = frameInfo.timeSincePreviousFrame || 0;

    if (action === 'enter') {
      if (hasEntered.value) return;
      frameTimer.value += dt;
      if (frameTimer.value >= timePerFrame) {
        const nextFrame = Math.floor(currentFrame.value) + 1;
        if (nextFrame >= totalFrames) {
          currentFrame.value = totalFrames - 1;
          hasEntered.value = true;
          if (onEnterComplete) {
            runOnJS(onEnterComplete)();
          }
        } else {
          currentFrame.value = nextFrame;
        }
        frameTimer.value -= timePerFrame;
      }
      return;
    }

    if (action === 'walk') {
      frameTimer.value += dt;
      if (frameTimer.value >= timePerFrame) {
        currentFrame.value = (Math.floor(currentFrame.value) + 1) % totalFrames;
        frameTimer.value -= timePerFrame; 
      }
    }
  });

  // 1. Hardware-accelerated sliding image
  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: frameWidth * totalFrames,
      height: frameHeight,
      transform: [
        { translateX: -(Math.floor(currentFrame.value) * frameWidth) }
      ]
    };
  });

  // 2. Hardware-accelerated container transforms
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: frameWidth,
      height: frameHeight,
      overflow: 'hidden',
      transform: [
        { scaleX: flipX ? -1 : 1 },
        { scale: breathScale.value * scale }
      ]
    };
  });

  return (
    <Animated.View style={[containerAnimatedStyle, style]}>
      <AnimatedExpoImage
        source={{ uri: imageUrl }}
        style={imageAnimatedStyle}
        contentFit="fill"
        cachePolicy="memory-disk"
      />
    </Animated.View>
  );
};
