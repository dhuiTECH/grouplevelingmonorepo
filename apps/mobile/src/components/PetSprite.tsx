import React, { useEffect } from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { 
  useSharedValue, 
  useFrameCallback, 
  useAnimatedStyle,
  useAnimatedReaction,
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing,
  runOnJS,
  cancelAnimation
} from 'react-native-reanimated';
import { Image } from 'expo-image';

// Create an animated version of expo-image
const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

/** Idle “breathing” scale amplitude (battle / UI); keep subtle so it doesn’t overpower the sprite. */
const BREATH_SCALE_PEAK = 1.012;
const BREATH_HALF_DURATION_MS = 1400;

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
  isMoving, // Optional SharedValue for frame-perfect sync
  style
}: any) => {
  const currentFrame = useSharedValue(idleIndex);
  const frameTimer = useSharedValue(0);
  const breathScale = useSharedValue(1);
  const hasEntered = useSharedValue(false);

  // Sync animation state with SharedValue if provided (bypasses JS thread delay)
  useAnimatedReaction(
    () => (isMoving ? isMoving.value : null),
    (moving: boolean | null, prev: boolean | null) => {
      if (moving === null || moving === prev) return;

      if (!moving) {
        // Force back to idle
        currentFrame.value = idleIndex;
        frameTimer.value = 0;
        breathScale.value = withRepeat(
          withSequence(
            withTiming(BREATH_SCALE_PEAK, {
              duration: BREATH_HALF_DURATION_MS,
              easing: Easing.inOut(Easing.sin),
            }),
            withTiming(1, {
              duration: BREATH_HALF_DURATION_MS,
              easing: Easing.inOut(Easing.sin),
            })
          ),
          -1,
          true
        );
      } else {
        // Start walking
        cancelAnimation(breathScale);
        breathScale.value = 1;
        // Instantly reset to the start of the walk cycle
        currentFrame.value = 0;
        frameTimer.value = 0;
      }
    }
  );

  useEffect(() => {
    // If using SharedValue for movement, we skip the JS-based useEffect sync for walk/idle
    if (isMoving) return;

    if (action === 'idle') {
      currentFrame.value = idleIndex;
      frameTimer.value = 0;
      breathScale.value = withRepeat(
        withSequence(
          withTiming(BREATH_SCALE_PEAK, {
            duration: BREATH_HALF_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(1, {
            duration: BREATH_HALF_DURATION_MS,
            easing: Easing.inOut(Easing.sin),
          })
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

    // Determine action: SharedValue takes priority for zero-lag sync
    let effectiveAction = action;
    if (isMoving && typeof isMoving === 'object') {
      effectiveAction = isMoving.value ? 'walk' : 'idle';
    }

    if (effectiveAction === 'idle') return;

    const timePerFrame = totalTimeMs / totalFrames;
    const dt = frameInfo.timeSincePreviousFrame || 0;

    if (effectiveAction === 'enter') {
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

    if (effectiveAction === 'walk') {
      frameTimer.value += dt;
      if (frameTimer.value >= timePerFrame) {
        currentFrame.value = (Math.floor(currentFrame.value) + 1) % totalFrames;
        frameTimer.value -= timePerFrame; 
      }
    }
  });

  const sWidth = Math.round(frameWidth * scale);
  const sHeight = Math.round(frameHeight * scale);

  // 1. Hardware-accelerated sliding image
  const imageAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -(Math.floor(currentFrame.value) * sWidth) }
      ]
    };
  });

  // 2. Container transform (flip + breath scale)
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scaleX: flipX ? -1 : 1 },
        { scale: breathScale.value }
      ]
    };
  });

  return (
    <Animated.View 
      style={[
        {
          width: sWidth,
          height: sHeight,
          overflow: 'hidden',
        },
        containerAnimatedStyle, 
        style
      ]}
    >
      <AnimatedExpoImage
        source={{ uri: imageUrl }}
        style={[
          {
            width: totalFrames > 1 ? sWidth * totalFrames : sWidth,
            height: sHeight,
          },
          imageAnimatedStyle
        ]}
        contentFit={totalFrames > 1 ? "fill" : "contain"}
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
    </Animated.View>
  );
};
