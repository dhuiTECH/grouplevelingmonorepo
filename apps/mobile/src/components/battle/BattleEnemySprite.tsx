import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useFrameCallback,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';

const AnimatedExpoImage = Animated.createAnimatedComponent(Image);

/** Match PetSprite idle breathing (battle / UI). */
const BREATH_SCALE_PEAK = 1.012;
const BREATH_HALF_DURATION_MS = 1400;

export interface BattleEnemySpriteProps {
  imageUrl: string;
  action?: 'idle' | 'enter';
  idleIndex?: number;
  totalFrames: number;
  totalTimeMs: number;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  /** When true, single-frame images use `fill` so source pixels map 1:1 to layout (no letterboxing). */
  pixelPerfect?: boolean;
  onEnterComplete?: () => void;
  style?: ViewStyle;
}

/**
 * Battle-only spritesheet renderer: idle breathing + enter sequence.
 * No walk / isMoving (see PetSprite for full pet/world behavior).
 */
export function BattleEnemySprite({
  imageUrl,
  action = 'idle',
  idleIndex = 0,
  totalFrames = 1,
  totalTimeMs = 1000,
  frameWidth,
  frameHeight,
  scale = 1,
  pixelPerfect = false,
  onEnterComplete,
  style,
}: BattleEnemySpriteProps) {
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
    }
  });

  const sWidth = Math.round(frameWidth * scale);
  const sHeight = Math.round(frameHeight * scale);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -(Math.floor(currentFrame.value) * sWidth) }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: sWidth,
          height: sHeight,
          overflow: 'hidden',
        },
        containerAnimatedStyle,
        style,
      ]}
    >
      <AnimatedExpoImage
        source={{ uri: imageUrl }}
        style={[
          {
            width: totalFrames > 1 ? sWidth * totalFrames : sWidth,
            height: sHeight,
          },
          imageAnimatedStyle,
        ]}
        contentFit={totalFrames > 1 || pixelPerfect ? 'fill' : 'contain'}
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
    </Animated.View>
  );
}
