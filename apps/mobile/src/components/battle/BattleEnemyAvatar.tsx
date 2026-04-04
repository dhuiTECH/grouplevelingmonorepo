import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import { getPetSpriteSource, getPetSpriteConfig } from '@/utils/pet-sprites';
import { BattleEnemySprite } from './BattleEnemySprite';

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s ? s : null;
}

export interface BattleEnemyAvatarProps {
  petDetails?: any;
  size?: number;
  style?: ViewStyle;
  /** Battle enemy uses idle + enter only; `walk` is treated as idle. */
  action?: 'idle' | 'walk' | 'enter';
  onEnterComplete?: () => void;
}

/**
 * In-combat enemy figure: same URL + scale math as OptimizedPetAvatar (monster sheet),
 * without background / walking / PetSprite extras — renders BattleEnemySprite.
 */
export function BattleEnemyAvatar({
  petDetails,
  size = 64,
  style,
  action = 'idle',
  onEnterComplete,
}: BattleEnemyAvatarProps) {
  const safeSize = Math.floor(size);

  const imageUrl = useMemo(() => {
    const visuals = petDetails?.metadata?.visuals;
    const legacyUrl = getPetSpriteSource(petDetails);

    const walkSheetUrl = toStringOrNull(visuals?.walking_spritesheet?.url);
    const monsterUrl = toStringOrNull(visuals?.monster_url);
    const spriteSheetUrl =
      toStringOrNull(visuals?.spritesheet?.url) ?? toStringOrNull(visuals?.spritesheet_url);

    // Match OptimizedPetAvatar with spritesheetType === 'monster'
    if (monsterUrl || spriteSheetUrl) {
      return monsterUrl ?? spriteSheetUrl!;
    }

    if (walkSheetUrl) return walkSheetUrl;
    if (spriteSheetUrl) return spriteSheetUrl;
    if (monsterUrl) return monsterUrl;

    return legacyUrl || '';
  }, [petDetails]);

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
        idleIndex: 0,
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

  const maxDim = Math.max(frameWidth, frameHeight);
  const scale = (safeSize * 0.8) / maxDim;

  const wrapperStyle = [
    {
      width: safeSize,
      height: safeSize,
      borderRadius: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
    },
    style,
  ];

  const spriteAction: 'idle' | 'enter' = action === 'enter' ? 'enter' : 'idle';

  if (!imageUrl) {
    return <View style={[wrapperStyle, { backgroundColor: 'rgba(148, 163, 184, 0.12)' }]} />;
  }

  return (
    <View style={wrapperStyle}>
      <BattleEnemySprite
        imageUrl={imageUrl}
        action={spriteAction}
        idleIndex={idleIndex}
        totalFrames={totalFrames}
        totalTimeMs={durationMs}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
        scale={scale}
        onEnterComplete={onEnterComplete}
        style={{
          position: 'absolute',
          left: (safeSize - Math.round(frameWidth * scale)) / 2 + safeSize * 0.05,
          top: (safeSize - Math.round(frameHeight * scale)) / 2,
        }}
      />
    </View>
  );
}
