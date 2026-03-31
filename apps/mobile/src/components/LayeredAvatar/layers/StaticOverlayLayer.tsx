import React, { useState, useEffect } from 'react';
import { View, Image as RNImage, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { ShopItemMedia } from '../../ShopItemMedia';
import { FALLBACK_STATIC_SIZE, increaseSaturationForDarkSkin } from '../LayeredAvatarUtils';
import { WeaponAttackAnimatedInner } from '../WeaponAttackAnimatedInner';
import type { WeaponAttackPresetId } from '../weaponGripAttackPresets';

/** Static overlay layer that sizes by image intrinsic dimensions (matches Next.js: natural size × scale × scaleRatio). */
const StaticOverlayLayer: React.FC<{
  cosmetic: any;
  item: any;
  leftPercent: number;
  topPercent: number;
  zIndex: number;
  dbScale: number;
  scaleRatio: number;
  rotation: number;
  tintColor?: string | null;
  silhouetteUrl?: string | null;
  weaponAttack?: { attackKey: number; preset: WeaponAttackPresetId; durationMs: number } | null;
}> = ({
  cosmetic,
  item,
  leftPercent,
  topPercent,
  zIndex,
  dbScale,
  scaleRatio,
  rotation,
  tintColor,
  silhouetteUrl,
  weaponAttack,
}) => {
  const [intrinsicSize, setIntrinsicSize] = useState<number | null>(null);
  const uri = item?.image_url;

  useEffect(() => {
    if (!uri || typeof uri !== 'string') return;
    RNImage.getSize(
      uri,
      (width, height) => setIntrinsicSize(Math.max(width, height)),
      () => setIntrinsicSize(FALLBACK_STATIC_SIZE)
    );
  }, [uri]);

  const baseSize = intrinsicSize ?? FALLBACK_STATIC_SIZE;
  const finalSize = baseSize * dbScale * scaleRatio;

  return (
    <View
      style={{
        position: 'absolute',
        zIndex: zIndex,
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: finalSize,
        height: finalSize,
        overflow: 'visible',
        transform: [
          { translateX: -finalSize / 2 },
          { translateY: -finalSize / 2 },
          { rotate: `${rotation}deg` }
        ],
      }}
      pointerEvents="none"
      collapsable={false}
    >
      <WeaponAttackAnimatedInner
        attackKey={weaponAttack?.attackKey}
        attackPreset={weaponAttack?.preset ?? null}
        durationMs={weaponAttack?.durationMs ?? 500}
      >
        {tintColor && silhouetteUrl && (
          <>
            <Image
              source={{ uri: silhouetteUrl }}
              style={[StyleSheet.absoluteFill, { tintColor: increaseSaturationForDarkSkin(tintColor) }]}
              contentFit="contain"
              cachePolicy="none"
            />
            <Image
              source={{ uri: silhouetteUrl }}
              style={[StyleSheet.absoluteFill, { tintColor: '#000000', opacity: 0.20 }]}
              contentFit="contain"
              cachePolicy="none"
            />
          </>
        )}
        <ShopItemMedia
          item={item}
          animate={false}
          forceFullImage={true}
          style={{ width: finalSize, height: finalSize }}
          resizeMode="contain"
        />
      </WeaponAttackAnimatedInner>
    </View>
  );
};

export default StaticOverlayLayer;
