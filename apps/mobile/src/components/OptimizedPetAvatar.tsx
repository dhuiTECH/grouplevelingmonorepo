import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { PetSprite } from './PetSprite';
import { getPetSpriteSource, getPetSpriteConfig } from '@/utils/pet-sprites';

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

interface OptimizedPetAvatarProps {
  petDetails?: any;
  size?: number;
  style?: ViewStyle;
  square?: boolean;
  hideBackground?: boolean;
  background?: string | null;
  isWalking?: boolean;
  spritesheetType?: 'walking' | 'monster'; // 'walking' for world map, 'monster' for inventory/battle
  action?: 'idle' | 'walk' | 'enter'; // Animation action
  onEnterComplete?: () => void; // Callback when enter animation completes
}

export const OptimizedPetAvatar = ({
  petDetails,
  size = 64,
  style,
  square = true,
  hideBackground = false,
  background,
  isWalking = false,
  spritesheetType = 'monster', // Default to monster/icon sheet for UI screens
  action = 'idle',
  onEnterComplete,
}: OptimizedPetAvatarProps) => {
  const safeSize = Math.floor(size);
  const borderRadius = square ? 12 : safeSize / 2;
  const effectiveBackground = background || petDetails?.metadata?.equipped_background;

  // 1. Determine which image URL to use (Always prefer a high-res spritesheet URL)
  const imageUrl = useMemo(() => {
    const visuals = petDetails?.metadata?.visuals;
    const legacyUrl = getPetSpriteSource(petDetails);

    const walkSheetUrl = toStringOrNull(visuals?.walking_spritesheet?.url);
    const monsterUrl = toStringOrNull(visuals?.monster_url);
    const spriteSheetUrl =
      toStringOrNull(visuals?.spritesheet?.url) ??
      toStringOrNull(visuals?.spritesheet_url);

    // A. If it asks for 'walking' and we have it, use that dedicated sheet.
    if (spritesheetType === 'walking' && walkSheetUrl) {
      return walkSheetUrl;
    }

    // B. If it asks for 'monster' and we have a monster/spritesheet URL, use that.
    if (spritesheetType === 'monster' && (monsterUrl || spriteSheetUrl)) {
      return monsterUrl ?? spriteSheetUrl!;
    }

    // C. THE FIX: If the requested sheet is missing, grab ANY available high-res spritesheet URL.
    if (walkSheetUrl) return walkSheetUrl;
    if (spriteSheetUrl) return spriteSheetUrl;
    if (monsterUrl) return monsterUrl;

    // D. Absolute last resort: whatever getPetSpriteSource gives us (may be a thumbnail).
    return legacyUrl || '';
  }, [petDetails, spritesheetType]);

  // 2. Extract math from the selected spritesheet metadata (match PetLayeredAvatar / getPetSpriteConfig)
  const spriteConfig = useMemo(() => getPetSpriteConfig(petDetails), [petDetails]);

  const { totalFrames, durationMs, frameWidth, frameHeight, idleIndex } = useMemo(() => {
    if (spriteConfig) {
      const fWidth = spriteConfig.frameWidth || 64;
      const fHeight = spriteConfig.frameHeight || 64;
      const tFrames = spriteConfig.totalFrames || 1;
      const fps = spriteConfig.fps || 10;

      return {
        totalFrames: Math.max(1, Math.floor(tFrames)),
        durationMs: Math.max(1, Math.floor((tFrames * 1000) / fps)),
        frameWidth: fWidth,
        frameHeight: fHeight,
        idleIndex: 0, // First frame as idle
      };
    }

    return {
      totalFrames: 1,
      durationMs: 1000,
      frameWidth: safeSize,
      frameHeight: safeSize,
      idleIndex: 0,
    };
  }, [spriteConfig, safeSize]);

  // 3. Calculate Scale
  // We need to fit the larger dimension into safeSize with a safety margin
  const maxDim = Math.max(frameWidth, frameHeight);
  const scale = (safeSize * 0.8) / maxDim;

  // The wrapper sets the bounding box
  const wrapperStyle = [
    { 
      width: safeSize, 
      height: safeSize, 
      borderRadius,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
    }, 
    style
  ];

  if (!imageUrl) {
    return (
      <View style={[wrapperStyle, { backgroundColor: 'rgba(148, 163, 184, 0.12)' }]} />
    );
  }

  return (
    <View style={wrapperStyle}>
      {/* Background Layer */}
      {!hideBackground && (
        effectiveBackground ? (
          <Image
            source={{ uri: effectiveBackground }}
            style={[{ position: 'absolute', width: '100%', height: '100%', borderRadius }]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[{ position: 'absolute', width: '100%', height: '100%', borderRadius, backgroundColor: 'rgba(15, 23, 42, 0.65)' }]} />
        )
      )}

      {/* Foreground PetSprite - Standard React Native Positioning */}
      <PetSprite
        imageUrl={imageUrl}
        action={action === 'enter' ? 'enter' : (isWalking && spritesheetType === 'walking' ? 'walk' : 'idle')}
        idleIndex={idleIndex}
        totalFrames={totalFrames}
        totalTimeMs={durationMs}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
        scale={scale}
        flipX={false}
        onEnterComplete={onEnterComplete}
        style={{ 
          position: 'absolute',
          // Centering logic: place the large frame such that its center matches the safeSize center.
          // Now using the rounded scaled dimensions for perfect sharpness and alignment.
          left: (safeSize - Math.round(frameWidth * scale)) / 2 + (safeSize * 0.05),
          top: (safeSize - Math.round(frameHeight * scale)) / 2,
        }}
      />
    </View>
  );
};
