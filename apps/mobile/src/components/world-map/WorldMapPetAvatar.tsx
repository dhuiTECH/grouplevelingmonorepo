import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { getPetSpriteSource } from '@/utils/pet-sprites';

interface PetSpriteConfig {
  totalFrames: number;
  fps: number;
  frameWidth: number;
  frameHeight: number;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s ? s : null;
}

// Local helper specifically for walking/idle animations from metadata.visuals.walking_spritesheet
function getWalkingSpriteConfig(petDetails: any, isWalking: boolean): { uri: string | null; config: PetSpriteConfig | null; idleFrame: number | null } {
  const walkSheet = petDetails?.metadata?.visuals?.walking_spritesheet;
  if (!walkSheet) return { uri: null, config: null, idleFrame: null };

  const walkingUrl = toStringOrNull(walkSheet?.url);
  
  const frameWidth = toNumber(walkSheet?.frame_width) ?? 64;
  const frameHeight = toNumber(walkSheet?.frame_height) ?? 64;
  const totalFrames = toNumber(walkSheet?.frame_count) ?? 1;
  const durationMs = toNumber(walkSheet?.duration_ms);
  
  let fps = 10;
  if (durationMs != null && durationMs > 0 && totalFrames > 1) {
    fps = (totalFrames * 1000) / durationMs;
  }
  fps = Math.min(60, Math.max(1, fps));
  
  let idleFrame = toNumber(walkSheet?.idle_frame);
  if (idleFrame != null && idleFrame < 0) idleFrame = null;
  else if (idleFrame != null) idleFrame = Math.floor(idleFrame);
  else idleFrame = null;

  let config: PetSpriteConfig | null = null;
  if (totalFrames > 1) {
    config = {
      totalFrames: Math.max(2, Math.floor(totalFrames)),
      fps,
      frameWidth: Math.max(1, Math.floor(frameWidth)),
      frameHeight: Math.max(1, Math.floor(frameHeight)),
    };
  }

  // If idle and idle_frame is configured, or walking and url is present, use walking spritesheet
  if (walkingUrl) {
    if (isWalking || idleFrame !== null) {
        return { uri: walkingUrl, config, idleFrame };
    }
  }

  return { uri: null, config: null, idleFrame };
}


interface WorldMapPetAvatarProps {
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

const WorldMapPetAvatarInternal = ({
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
}: WorldMapPetAvatarProps): JSX.Element => {
  
  // Try to extract the walking/idle config first
  const { uri: walkingUri, config: walkingConfig, idleFrame } = useMemo(() => getWalkingSpriteConfig(petDetails, isWalking), [petDetails, isWalking]);
  
  // If no walking config is found or applied, fallback to the legacy source
  const fallbackUri = useMemo(() => getPetSpriteSource(petDetails), [petDetails]);
  
  const uri = walkingUri || fallbackUri;
  const spriteConfig = walkingConfig; // If we use fallbackUri, we won't animate it as a spritesheet here (relies on legacy handling, but we don't fetch legacy config here)

  const animationType = isWalking ? 'walking' : 'idle';

  // If idle and idle_frame is set, show that frame statically (no animation)
  const useStaticIdleFrame = !isWalking && idleFrame !== null && spriteConfig !== null;

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
  
  // 1. Correct Sprite Frame Dimensions
  // Using the actual frame aspect ratio from the configuration
  const frameWidthRatio = spriteConfig ? (spriteConfig.frameWidth / spriteConfig.frameHeight) : 1;
  // The rendered width of a single frame
  const displayFrameWidth = safeSize * frameWidthRatio;
  // The total width of the entire horizontal strip
  const stripWidth = totalFrames * displayFrameWidth;
  
  // 2. Fix translateX Interpolation
  const translateX = frameAnim.interpolate({
    inputRange: Array.from({ length: interpFrames }, (_, i) => i),
    outputRange: Array.from({ length: interpFrames }, (_, i) => -i * displayFrameWidth),
    extrapolate: 'clamp',
  });

  // 3. Fix Idle Frame Offset
  // Negative offset based on the exact rendered width of a frame
  const idleFrameOffset = useStaticIdleFrame ? -(idleFrame! * displayFrameWidth) : 0;

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

  const effectiveBackground = background || petDetails?.metadata?.equipped_background;

  const renderSpriteContent = () => {
    if (!uri) return <View style={[styles.fallback, { borderRadius }]} />;

    // Has spritesheet config (multi-frame) AND it's a walking/idle config (we only do horizontal loop bleed protection here)
    if (spriteConfig) {
      if (useStaticIdleFrame) {
        // Show static idle frame
        return (
          <View style={[styles.window, { width: displayFrameWidth, height: safeSize, borderRadius, overflow: 'hidden', alignItems: 'flex-start' }]}>
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
        <View style={[styles.window, { width: displayFrameWidth, height: safeSize, borderRadius, overflow: 'hidden', alignItems: 'flex-start' }]}>
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

    // Single image fallback (legacy or no walking sheet defined)
    return (
      <Image
        source={{ uri }}
        style={[styles.sprite, { width: safeSize, height: safeSize, borderRadius }]}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    );
  };

  // Safe wrapper for styles
  const wrapperStyle = [styles.container, { width: safeSize, height: safeSize, borderRadius }, style];

  return (
    <View style={wrapperStyle}>
      {!hideBackground && (
        effectiveBackground ? (
          <Image
            source={{ uri: effectiveBackground }}
            style={[styles.bg, { borderRadius, width: safeSize, height: safeSize }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.bg, { borderRadius, width: safeSize, height: safeSize }]} />
        )
      )}

      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleY }], alignItems: 'center', justifyContent: 'center', overflow: 'visible' }]}>
        {renderSpriteContent()}
      </Animated.View>
    </View>
  );
};

export const WorldMapPetAvatar = React.memo(WorldMapPetAvatarInternal, (prev, next) => {
  if (prev.size !== next.size) return false;
  if (prev.animate !== next.animate) return false;
  if (prev.breathe !== next.breathe) return false;
  if (prev.hideBackground !== next.hideBackground) return false;
  if (prev.background !== next.background) return false;
  if (prev.isWalking !== next.isWalking) return false;

  if (prev.petDetails?.id !== next.petDetails?.id) return false;
  if (prev.petDetails?.image_url !== next.petDetails?.image_url) return false;
  if (prev.petDetails?.metadata?.equipped_background !== next.petDetails?.metadata?.equipped_background) return false;
  if (prev.petDetails?.metadata?.visuals?.walking_spritesheet?.idle_frame !== next.petDetails?.metadata?.visuals?.walking_spritesheet?.idle_frame) return false;

  return true;
});

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  window: {
    overflow: 'hidden',
  },
  sprite: {},
  fallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
});
