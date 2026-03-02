import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getPetSpriteConfig, getPetSpriteSource, getPetIdleFrame } from '@/utils/pet-sprites';

interface PetLayeredAvatarProps {
  petDetails?: any;
  size?: number;
  style?: ViewStyle;
  square?: boolean;
  hideBackground?: boolean;
  animate?: boolean;
  breathe?: boolean;
  borderRadius?: number;
  background?: string | null;
  isWalking?: boolean;
}

const PetLayeredAvatarInternal = ({
  petDetails,
  size = 64,
  style,
  square = true,
  hideBackground = false,
  animate = true,
  breathe: breatheProp = true,
  borderRadius: customBorderRadius,
  background,
  isWalking = false,
}: PetLayeredAvatarProps): JSX.Element => {
  const animationType = isWalking ? 'walking' : 'idle';
  const uri = useMemo(() => getPetSpriteSource(petDetails, animationType), [petDetails, animationType]);
  const spriteConfig = useMemo(() => getPetSpriteConfig(petDetails, animationType), [petDetails, animationType]);

  // When idle, check if a specific idle frame is configured
  const idleFrame = useMemo(() => {
    if (isWalking) return null;
    return getPetIdleFrame(petDetails);
  }, [petDetails, isWalking]);

  // If idle and idle_frame is set, show that frame statically (no animation)
  const useStaticIdleFrame = !isWalking && idleFrame !== null;

  const safeSize = Math.floor(size);
  const totalFrames = spriteConfig?.totalFrames ?? 1;
  const fps = spriteConfig?.fps ?? 10;

  const frameAnim = useRef(new Animated.Value(0)).current;

  // Reset frame when switching animation types
  useEffect(() => {
    frameAnim.setValue(0);
  }, [animationType, frameAnim]);

  useEffect(() => {
    // Don't animate if using a static idle frame
    if (useStaticIdleFrame) {
      frameAnim.setValue(0);
      return;
    }

    if (!spriteConfig || !animate || totalFrames <= 1) {
      frameAnim.setValue(0);
      return;
    }

    const frameDuration = 1000 / fps;
    const steps = [];
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
  }, [spriteConfig, animate, totalFrames, fps, frameAnim, animationType, useStaticIdleFrame]);

  const interpFrames = Math.max(2, totalFrames);
  const translateX = frameAnim.interpolate({
    inputRange: Array.from({ length: interpFrames }, (_, i) => i),
    outputRange: Array.from({ length: interpFrames }, (_, i) => -i * safeSize),
    extrapolate: 'clamp',
  });

  // Static idle frame offset
  const idleFrameOffset = useStaticIdleFrame ? -(idleFrame! * safeSize) : 0;

  const breathe = breatheProp && !isWalking;
  const breatheAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!breathe) {
      breatheAnim.setValue(0);
      return;
    }
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
    outputRange: [1, 1.02],
  });

  const borderRadius = customBorderRadius !== undefined ? customBorderRadius : (square ? 12 : safeSize / 2);

  const stripWidth = totalFrames * safeSize;

  const effectiveBackground = background || petDetails?.metadata?.equipped_background;

  const renderSpriteContent = () => {
    if (!uri) return <View style={[styles.fallback, { borderRadius }]} />;

    // Has spritesheet config (multi-frame)
    if (spriteConfig) {
      if (useStaticIdleFrame) {
        // Show static idle frame
        return (
          <View style={[styles.window, { width: safeSize, height: safeSize, borderRadius }]}>
            <View style={{ width: stripWidth, height: safeSize, transform: [{ translateX: idleFrameOffset }] }}>
              <Image
                source={{ uri }}
                style={{ width: stripWidth, height: safeSize }}
                contentFit="fill"
                cachePolicy="memory-disk"
              />
            </View>
          </View>
        );
      }

      return (
        <View style={[styles.window, { width: safeSize, height: safeSize, borderRadius }]}>
          {animate ? (
            <Animated.View style={{ width: stripWidth, height: safeSize, transform: [{ translateX }] }}>
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
      );
    }

    // Single image fallback
    return (
      <Image
        source={{ uri }}
        style={[styles.sprite, { width: safeSize, height: safeSize, borderRadius }]}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    );
  };

  return (
    <View style={[styles.container, { width: safeSize, height: safeSize, borderRadius }, style]}>
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

      <Animated.View style={[StyleSheet.absoluteFill, { transform: breathe ? [{ scaleY }] : undefined }]}>
        {renderSpriteContent()}
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
  if (prev.isWalking !== next.isWalking) return false;

  if (prev.petDetails?.id !== next.petDetails?.id) return false;
  if (prev.petDetails?.image_url !== next.petDetails?.image_url) return false;
  if (prev.petDetails?.metadata?.equipped_background !== next.petDetails?.metadata?.equipped_background) return false;
  if (prev.petDetails?.metadata?.visuals?.spritesheet?.idle_frame !== next.petDetails?.metadata?.visuals?.spritesheet?.idle_frame) return false;

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
  window: {},
  sprite: {},
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
});
