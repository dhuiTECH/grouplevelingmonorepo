import React, { useEffect, useMemo, useState } from 'react';
import { Image, View, ViewStyle } from 'react-native';
import {
  getPetSpriteConfig,
  getPetSpriteSource,
  getSpriteFrameDimensionsFromMetadata,
} from '@/utils/pet-sprites';
import { BattleEnemySprite } from './BattleEnemySprite';
import { getLocalAssetUri } from '@/utils/assetManager';

/** Multiplier on source pixel size for `oneToOne` battle sprites (layout points per source pixel). */
const ONE_TO_ONE_DISPLAY_SCALE = 0.4;

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s ? s : null;
}

export type PixelSizeMode = 'normalized' | 'oneToOne';

export interface BattleEnemyAvatarProps {
  petDetails?: any;
  size?: number;
  style?: ViewStyle;
  /**
   * `oneToOne`: each source pixel maps to `ONE_TO_ONE_DISPLAY_SCALE` layout points.
   * `normalized`: legacy behavior — sprite is scaled to `size` with 0.8 factor.
   */
  pixelSizeMode?: PixelSizeMode;
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
  pixelSizeMode = 'oneToOne',
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

    if (monsterUrl || spriteSheetUrl) {
      return monsterUrl ?? spriteSheetUrl!;
    }

    if (walkSheetUrl) return walkSheetUrl;
    if (spriteSheetUrl) return spriteSheetUrl;
    if (monsterUrl) return monsterUrl;

    return legacyUrl || '';
  }, [petDetails]);

  const resolvedImageUrl = useMemo(() => {
    if (!imageUrl) return '';
    return getLocalAssetUri(imageUrl);
  }, [imageUrl]);

  const spriteConfig = useMemo(() => getPetSpriteConfig(petDetails), [petDetails]);
  const metaFrameDims = useMemo(
    () => getSpriteFrameDimensionsFromMetadata(petDetails),
    [petDetails]
  );

  const [intrinsicFrame, setIntrinsicFrame] = useState<{ w: number; h: number } | null>(null);
  const [intrinsicFailed, setIntrinsicFailed] = useState(false);

  useEffect(() => {
    setIntrinsicFrame(null);
    setIntrinsicFailed(false);
  }, [resolvedImageUrl]);

  useEffect(() => {
    if (pixelSizeMode !== 'oneToOne') return;
    if (!resolvedImageUrl) return;
    if (spriteConfig || metaFrameDims) return;

    Image.getSize(
      resolvedImageUrl,
      (w, h) => {
        if (w > 0 && h > 0) setIntrinsicFrame({ w, h });
        else setIntrinsicFailed(true);
      },
      () => setIntrinsicFailed(true)
    );
  }, [pixelSizeMode, resolvedImageUrl, spriteConfig, metaFrameDims]);

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

    if (pixelSizeMode === 'oneToOne') {
      if (metaFrameDims) {
        return {
          totalFrames: 1,
          durationMs: 1000,
          frameWidth: metaFrameDims.frameWidth,
          frameHeight: metaFrameDims.frameHeight,
          idleIndex: 0,
        };
      }
      if (intrinsicFrame) {
        return {
          totalFrames: 1,
          durationMs: 1000,
          frameWidth: intrinsicFrame.w,
          frameHeight: intrinsicFrame.h,
          idleIndex: 0,
        };
      }
    }

    return {
      totalFrames: 1,
      durationMs: 1000,
      frameWidth: safeSize,
      frameHeight: safeSize,
      idleIndex: 0,
    };
  }, [spriteConfig, pixelSizeMode, metaFrameDims, intrinsicFrame, safeSize]);

  const isOneToOneLoading =
    pixelSizeMode === 'oneToOne' &&
    !spriteConfig &&
    !metaFrameDims &&
    !intrinsicFrame &&
    !intrinsicFailed &&
    !!resolvedImageUrl;

  const useNormalizedFallback =
    pixelSizeMode === 'normalized' ||
    (pixelSizeMode === 'oneToOne' &&
      !spriteConfig &&
      !metaFrameDims &&
      !intrinsicFrame &&
      (intrinsicFailed || !resolvedImageUrl));

  const maxDim = Math.max(frameWidth, frameHeight);
  const scale = useNormalizedFallback
    ? (safeSize * 0.8) / maxDim
    : ONE_TO_ONE_DISPLAY_SCALE;

  const boxW = useNormalizedFallback ? safeSize : Math.round(frameWidth * scale);
  const boxH = useNormalizedFallback ? safeSize : Math.round(frameHeight * scale);

  const wrapperStyle = [
    {
      width: boxW,
      height: boxH,
      borderRadius: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
    },
    style,
  ];

  const spriteAction: 'idle' | 'enter' = action === 'enter' ? 'enter' : 'idle';

  if (!resolvedImageUrl) {
    return <View style={[wrapperStyle, { backgroundColor: 'rgba(148, 163, 184, 0.12)' }]} />;
  }

  if (isOneToOneLoading) {
    const placeholder = Math.max(1, Math.round(safeSize * ONE_TO_ONE_DISPLAY_SCALE));
    return (
      <View
        style={[
          {
            width: placeholder,
            height: placeholder,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      />
    );
  }

  const spriteW = Math.round(frameWidth * scale);
  const spriteH = Math.round(frameHeight * scale);
  const leftOffset = useNormalizedFallback ? (safeSize - spriteW) / 2 + safeSize * 0.05 : 0;
  const topOffset = useNormalizedFallback ? (safeSize - spriteH) / 2 : 0;

  return (
    <View style={wrapperStyle}>
      <BattleEnemySprite
        imageUrl={resolvedImageUrl}
        action={spriteAction}
        idleIndex={idleIndex}
        totalFrames={totalFrames}
        totalTimeMs={durationMs}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
        scale={scale}
        pixelPerfect={pixelSizeMode === 'oneToOne' && !useNormalizedFallback}
        onEnterComplete={onEnterComplete}
        style={{
          position: 'absolute',
          left: leftOffset,
          top: topOffset,
        }}
      />
    </View>
  );
}
