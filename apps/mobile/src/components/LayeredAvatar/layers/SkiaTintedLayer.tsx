import React, { useState, useEffect } from 'react';
import { View, Image as RNImage } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, ColorMatrix } from '@shopify/react-native-skia';
import { ShopItemMedia } from '../../ShopItemMedia';
import { FALLBACK_STATIC_SIZE, hexToRgb } from '../LayeredAvatarUtils';
import { WeaponAttackAnimatedInner } from '../WeaponAttackAnimatedInner';
import type { WeaponAttackPresetId } from '../weaponGripAttackPresets';

/**
 * A specialized layer that uses Skia to apply a multiply blend mode.
 * This perfectly replicates the Next.js CSS mask-image + blend-mode: multiply effect.
 * It takes the single image (white skin + black lines), and multiplies a skin color over it.
 */
const SkiaTintedLayer: React.FC<{
  item: any;
  leftPercent: number;
  topPercent: number;
  zIndex: number;
  dbScale: number;
  scaleRatio: number;
  rotation: number;
  tintColor: string;
  weaponAttack?: { attackKey: number; preset: WeaponAttackPresetId; durationMs: number } | null;
}> = ({ item, leftPercent, topPercent, zIndex, dbScale, scaleRatio, rotation, tintColor, weaponAttack }) => {
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

  // useImage from Skia fetches the remote image to draw on the canvas
  const skiaImg = useImage(uri);
  
  const baseSize = intrinsicSize ?? FALLBACK_STATIC_SIZE;
  const finalSize = baseSize * dbScale * scaleRatio;
  
  // Calculate the color matrix for multiplying
  // We want to multiply the white pixels by the tintColor
  const [r, g, b] = hexToRgb(tintColor);
  
  const multiplyMatrix = [
    r, 0, 0, 0, 0,
    0, g, 0, 0, 0,
    0, 0, b, 0, 0,
    0, 0, 0, 1, 0,
  ];

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
        {skiaImg ? (
          <Canvas style={{ width: finalSize, height: finalSize }}>
            <SkiaImage
              image={skiaImg}
              fit="contain"
              x={0}
              y={0}
              width={finalSize}
              height={finalSize}
            >
              <ColorMatrix matrix={multiplyMatrix} />
            </SkiaImage>
          </Canvas>
        ) : (
          <ShopItemMedia
            item={item}
            animate={false}
            forceFullImage={true}
            style={{ width: finalSize, height: finalSize, opacity: 0 }}
            resizeMode="contain"
          />
        )}
      </WeaponAttackAnimatedInner>
    </View>
  );
};

export default SkiaTintedLayer;
