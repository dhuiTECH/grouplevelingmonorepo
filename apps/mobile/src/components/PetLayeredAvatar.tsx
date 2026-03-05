import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getPetSpriteConfig, getPetSpriteSource } from '@/utils/pet-sprites';

interface PetLayeredAvatarProps {
  petDetails?: any;
  size?: number;
  style?: ViewStyle;
  square?: boolean;
  hideBackground?: boolean;
  animate?: boolean;
  breathe?: boolean;
  borderRadius?: number;
  background?: string | null; // Added prop for background URL
  /** Optional key to trigger a one-shot spritesheet playback (non-looping). */
  playOnceKey?: string | number;
  /** Called after a one-shot playback finishes. */
  onPlayOnceComplete?: () => void;
}

const PetLayeredAvatarInternal = ({
  petDetails,
  size = 64,
  style,
  square = true,
  hideBackground = false,
  animate = true,
  breathe = true,
  borderRadius: customBorderRadius,
  background, // Destructure new prop
  playOnceKey,
  onPlayOnceComplete,
}: PetLayeredAvatarProps): JSX.Element => {
  const uri = useMemo(() => getPetSpriteSource(petDetails), [petDetails]);
  const spriteConfig = useMemo(() => getPetSpriteConfig(petDetails), [petDetails]);

  const safeSize = Math.floor(size);
  const totalFrames = spriteConfig?.totalFrames ?? 1;
  const fps = spriteConfig?.fps ?? 10;

  const frameAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!spriteConfig || totalFrames <= 1) {
      frameAnim.setValue(0);
      return;
    }

    const frameDuration = 1000 / fps;

    // One-shot playback when playOnceKey is provided.
    if (playOnceKey !== undefined && playOnceKey !== null) {
      frameAnim.setValue(0);

      const steps: Animated.CompositeAnimation[] = [];
      for (let i = 0; i < totalFrames; i++) {
        steps.push(
          Animated.timing(frameAnim, {
            toValue: i,
            duration: 0,
            easing: Easing.step0,
            useNativeDriver: true,
          }),
          Animated.delay(frameDuration),
        );
      }

      // After reaching the last frame, snap back to frame 0 (idle) and notify caller.
      steps.push(
        Animated.timing(frameAnim, {
          toValue: 0,
          duration: 0,
          easing: Easing.step0,
          useNativeDriver: true,
        }),
      );

      const sequence = Animated.sequence(steps);
      sequence.start(() => {
        onPlayOnceComplete?.();
      });

      return () => {
        sequence.stop();
      };
    }

    // Looping animation when animate=true and no one-shot key.
    if (!animate) {
      frameAnim.setValue(0);
      return;
    }

    const steps: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < totalFrames; i++) {
      steps.push(
        Animated.timing(frameAnim, {
          toValue: i,
          duration: 0,
          easing: Easing.step0,
          useNativeDriver: true,
        }),
        Animated.delay(frameDuration),
      );
    }

    const loop = Animated.loop(Animated.sequence(steps));
    loop.start();
    return () => loop.stop();
  }, [spriteConfig, animate, totalFrames, fps, frameAnim, playOnceKey, onPlayOnceComplete]);

  const interpFrames = Math.max(2, totalFrames);
  const translateX = frameAnim.interpolate({
    inputRange: Array.from({ length: interpFrames }, (_, i) => i),
    outputRange: Array.from({ length: interpFrames }, (_, i) => -i * safeSize),
    extrapolate: 'clamp',
  });

  const breatheAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!breathe) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, breatheAnim]);

  const scaleY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02], // Increased for better visibility
  });

  const borderRadius = customBorderRadius !== undefined ? customBorderRadius : (square ? 12 : safeSize / 2);

  const stripWidth = totalFrames * safeSize;

  // Determine background source priority:
  // 1. explicit 'background' prop
  // 2. petDetails.metadata.equipped_background (if petDetails is a UserPet object)
  const effectiveBackground = background || petDetails?.metadata?.equipped_background;
  
  return (
    <View style={[styles.container, { width: safeSize, height: safeSize, borderRadius }, style]}>
      {/* Background Layer - priority: hideBackground > effective background > default background */}
      {!hideBackground && (
        effectiveBackground ? (
          <Image
            source={{ uri: effectiveBackground }}
            style={[styles.bg, { borderRadius }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.bg, { borderRadius }]} />
        )
      )}

      {/* FIXED CRASH: Replaced conditionally undefined transform with empty array or [{ scaleY }] fallback */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleY }] }]}>
        {uri && spriteConfig ? (
          <View style={[styles.window, { width: safeSize, height: safeSize, borderRadius }]}>
            {animate ? (
              <Animated.View
                style={{
                  width: stripWidth,
                  height: safeSize,
                  transform: [{ translateX }],
                }}
              >
                <Image
                  source={{ uri }}
                  style={{ width: stripWidth, height: safeSize }}
                  contentFit="fill"
                  cachePolicy="memory-disk"
                />
              </Animated.View>
            ) : (
              <View style={{ width: stripWidth, height: safeSize }}>
                <Image
                  source={{ uri }}
                  style={{ width: stripWidth, height: safeSize }}
                  contentFit="fill"
                  cachePolicy="memory-disk"
                />
              </View>
            )}
          </View>
        ) : uri ? (
          <Image
            source={{ uri }}
            style={[styles.sprite, { width: safeSize, height: safeSize, borderRadius }]}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.fallback, { borderRadius }]} />
        )}
      </Animated.View>
    </View>
  );
};

export const PetLayeredAvatar = React.memo(PetLayeredAvatarInternal, (prev, next) => {
  if (prev.size !== next.size) return false;
  if (prev.animate !== next.animate) return false;
  if (prev.breathe !== next.breathe) return false;
  if (prev.hideBackground !== next.hideBackground) return false;
  if (prev.background !== next.background) return false;
  if (prev.playOnceKey !== next.playOnceKey) return false;
  
  if (prev.petDetails?.id !== next.petDetails?.id) return false;
  if (prev.petDetails?.image_url !== next.petDetails?.image_url) return false;
  if (prev.petDetails?.metadata?.equipped_background !== next.petDetails?.metadata?.equipped_background) return false;

  return true;
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  window: {
    // overflow: 'hidden', // Disabled to prevent clipping large sprites
  },
  sprite: {},
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
});
