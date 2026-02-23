import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';

// Retaining the interface to avoid breaking consumers like useBattleLogic.ts
export interface SkillAnimationConfig {
  sprite_url: string | null;
  sfx_url?: string | null;
  frame_count: number;
  frame_width: number;
  frame_height: number;
  offset_x?: number;
  offset_y?: number;
  preview_scale?: number | string;
  duration_ms: number;
  vfx_type?: 'impact' | 'projectile' | 'melee';
}

// Create the Animated version of Expo Image
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function SkillSpriteVfx({ config, targetX, targetY, startX, startY, playCount = 1, onEnd }: any) {
  // Fallback animation for when no sprite is available
  const fallbackScale = useSharedValue(0.5);
  // --- 1. SANITIZE INPUTS (The Anti-Crash Layer) ---
  // Default to 100x100 if data is missing to prevent 0-size invisible images
  const frameW = Number(config.frame_width) || 100;
  const frameH = Number(config.frame_height) || 100;
  const count = Math.max(1, Number(config.frame_count) || 1);
  const duration = Number(config.duration_ms) || 500;
  const scale = Number(config.preview_scale) || 1;
  const loops = Math.max(1, Number(playCount) || 1);
  
  // Offsets
  const offX = Number(config.offset_x) || 0;
  const offY = Number(config.offset_y) || 0;

  // SAFETY: If targetX/Y are NaN (layout not ready), default to arbitrary "safe" values (e.g. 200, 200)
  // This prevents the "Stuck at Bottom" bug where Y becomes 0 or undefined.
  const safeTargetX = isNaN(targetX) ? 200 : targetX;
  const safeTargetY = isNaN(targetY) ? 200 : targetY;

    // Calculate the MASSIVE strip dimensions explicitly
    const stripWidth = frameW * count * scale;
    const stripHeight = frameH * scale;

  // Calculate the "Camera Window" dimensions (dynamic for beams)
  const baseWindowWidth = frameW * scale;
  const baseWindowHeight = frameH * scale;

  const isProjectile = config.vfx_type === 'projectile' && startX != null && startY != null;
  const isBeam = config.vfx_type === 'beam' && startX != null && startY != null;
  const isAoe = config.vfx_type === 'aoe';
  const progress = useSharedValue(0);

  // --- 2. SOUND EFFECT (play once per skill use, in sync with sprite loops) ---
  // Create a new Sound instance per play so each one actually plays (expo-av won't replay the same instance while it's playing).
  const soundsRef = useRef<Audio.Sound[]>([]);
  useEffect(() => {
    if (!config.sfx_url) return;
    soundsRef.current = [];
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const uri = config.sfx_url;
    const playOne = () => {
      Audio.Sound.createAsync({ uri })
        .then(({ sound }) => {
          soundsRef.current.push(sound);
          sound.playAsync();
          sound.setOnPlaybackStatusUpdate((s) => {
            if (!s.isLoaded) return;
            if (s.didJustFinish) sound.unloadAsync().catch(() => {});
          });
        })
        .catch(() => {});
    };

    const totalDuration = duration * loops;

    for (let i = 0; i < loops; i++) {
      let sfxDelay = i * duration;
      // Reverted the sfxDelay override for projectiles to ensure sounds play before unmount.
      // The damage number delay in BattleScreen already handles the visual sync.
      timeouts.push(setTimeout(playOne, sfxDelay));
    }
    return () => {
      timeouts.forEach(clearTimeout);
      soundsRef.current.forEach((s) => s.unloadAsync().catch(() => {}));
      soundsRef.current = [];
    };
  }, [config.sfx_url, duration, loops]);

  // --- 3. ANIMATION DRIVER ---
  // Play sprite sheet (0 -> count) repeated `loops` times (skill use count)
  const totalFrames = count * loops;
  const totalDuration = duration * loops;
  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(totalFrames, {
      duration: totalDuration,
      easing: Easing.linear
    }, (finished) => {
      if (finished) runOnJS(onEnd)();
    });
  }, [config.sprite_url, count, duration, loops]); 

  // --- 4. FALLBACK ANIMATION ---
  const fallbackGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fallbackScale.value }]
  }));

  useEffect(() => {
    if (!config.sprite_url) {
      fallbackScale.value = 0.5;
      fallbackScale.value = withTiming(1.5, {
        duration: duration,
        easing: Easing.out(Easing.cubic)
      }, (finished) => {
        if (finished) runOnJS(onEnd)();
      });
    }
  }, [config.sprite_url, duration, onEnd]);

  // Calculate effective window dimensions for beams
  let effectiveWindowWidth = baseWindowWidth;
  let effectiveWindowHeight = baseWindowHeight;

  if (isBeam) {
    const sX = Number(startX) || safeTargetX;
    const sY = Number(startY) || safeTargetY;
    const dx = safeTargetX - sX;
    const dy = safeTargetY - sY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const scaleX = Math.max(1, dist / (frameW * scale));
    effectiveWindowWidth = frameW * scale * scaleX;
  }

  // --- 5. POSITIONING LOGIC ---
  const containerStyle = useAnimatedStyle(() => {
    let currX = safeTargetX;
    let currY = safeTargetY;
    let rotate = '0deg';

    if (isProjectile) {
      // Interpolate position based on progress (0 to 1 over full animation)
      const t = totalFrames > 0 ? progress.value / totalFrames : 0;
      const sX = Number(startX) || 0;
      const sY = Number(startY) || 0;

      // Linear interpolation
      currX = sX + (safeTargetX - sX) * t;
      currY = sY + (safeTargetY - sY) * t;
      rotate = '-90deg'; // Adjust rotation if needed
    } else if (isBeam) {
      // For beam: position at the MIDPOINT between caster and target
      const sX = Number(startX) || safeTargetX;
      const sY = Number(startY) || safeTargetY;
      const dx = safeTargetX - sX;
      const dy = safeTargetY - sY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI); // Convert to degrees

      // Calculate midpoint
      currX = (sX + safeTargetX) / 2;
      currY = (sY + safeTargetY) / 2;
      rotate = `${angle}deg`;
    } else if (isAoe) {
      // For AOE: center on the target area (could be enemy or party center)
      currX = safeTargetX;
      currY = safeTargetY;
    }

    return {
      left: currX - effectiveWindowWidth / 2, // Center the window on the coordinate
      top: currY - effectiveWindowHeight / 2,
      transform: [{ rotate }]
    };
  });

  // --- 5. SPRITE SLIDING LOGIC ---
  const imageStyle = useAnimatedStyle(() => {
    // Loop through frames: frame index = progress mod count (play sprite sheet N times)
    const currentFrame = Math.floor(progress.value) % count;
    const safeFrame = Math.min(currentFrame, count - 1);

    let transforms: any[] = [
      // Slide left by (Frame Index * Frame Width)
      { translateX: -(offX + safeFrame * frameW) * scale },
      { translateY: -offY * scale }
    ];

    if (isBeam) {
      // For beam: stretch horizontally to cover distance
      const sX = Number(startX) || safeTargetX;
      const sY = Number(startY) || safeTargetY;
      const dx = safeTargetX - sX;
      const dy = safeTargetY - sY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const scaleX = Math.max(1, dist / (frameW * scale)); // Stretch to cover distance, minimum 1

      transforms.unshift({ scaleX }); // Apply stretch first
    }

    return {
      transform: transforms
    };
  });

  if (!config.sprite_url) {
    // Fallback: Show a basic animated effect when no sprite is available
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fallbackEffect,
          { left: safeTargetX - 25, top: safeTargetY - 25 },
          containerStyle
        ]}
      >
        <Animated.View style={[styles.fallbackGlow, fallbackGlowStyle]} />
      </Animated.View>
    );
  }

  // Calculate effective window dimensions for the view
  const viewWidth = isBeam ? effectiveWindowWidth : baseWindowWidth;
  const viewHeight = isBeam ? effectiveWindowHeight : baseWindowHeight;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.window,
        { width: viewWidth, height: viewHeight },
        containerStyle
      ]}
    >
      <AnimatedImage
        source={{ uri: config.sprite_url }}
        cachePolicy="memory-disk" // Use the cache we warmed up
        style={[
          {
            width: stripWidth,   // 33,000px width
            height: stripHeight, // 400px height
          },
          imageStyle
        ]}
        contentFit="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    overflow: 'hidden', // Crops the massive strip to just the window
    zIndex: 1990,
  },
  fallbackEffect: {
    position: 'absolute',
    width: 50,
    height: 50,
    zIndex: 1990,
  },
  fallbackGlow: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    backgroundColor: 'rgba(34, 211, 238, 0.6)',
    shadowColor: '#22d3ee',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
});
