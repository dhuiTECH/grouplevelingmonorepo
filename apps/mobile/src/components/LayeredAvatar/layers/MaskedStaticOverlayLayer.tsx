import React, { useState, useEffect, useMemo } from 'react';
import { View, Image as RNImage } from 'react-native';
import {
  Canvas,
  Image as SkiaImage,
  useImage,
  ColorMatrix,
  Group,
  Mask,
  Rect,
} from '@shopify/react-native-skia';
import { FALLBACK_STATIC_SIZE, hexToRgb } from '../LayeredAvatarUtils';
import { WeaponAttackAnimatedInner } from '../WeaponAttackAnimatedInner';
import type { WeaponAttackPresetId } from '../weaponGripAttackPresets';

/**
 * Hybrid layer: global eraser mask + positioned item.
 * When `hairFillHex` is set, hair uses web-style solid fill in silhouette + multiply line art
 * instead of RGB multiply on the bitmap (which barely shifts full-color hair).
 */
const MaskedStaticOverlayLayer: React.FC<{
  item: any;
  maskUrl: string;
  leftPercent: number;
  topPercent: number;
  zIndex: number;
  dbScale: number;
  scaleRatio: number;
  rotation: number;
  size: number;
  tintColor?: string | null;
  /** When set (hair slot), render mask+fill+multiply like web LayeredAvatar */
  hairFillHex?: string | null;
  weaponAttack?: { attackKey: number; preset: WeaponAttackPresetId; durationMs: number } | null;
}> = ({
  item,
  maskUrl,
  leftPercent,
  topPercent,
  zIndex,
  dbScale,
  scaleRatio,
  rotation,
  size,
  tintColor,
  hairFillHex,
  weaponAttack,
}) => {
  const [intrinsicSize, setIntrinsicSize] = useState<number | null>(null);
  const lineUri = item?.image_url;
  const silhouetteUri = item?.image_base_url || item?.image_url;

  useEffect(() => {
    if (!lineUri || typeof lineUri !== 'string') return;
    RNImage.getSize(
      lineUri,
      (width, height) => setIntrinsicSize(Math.max(width, height)),
      () => setIntrinsicSize(FALLBACK_STATIC_SIZE)
    );
  }, [lineUri]);

  const lineImg = useImage(typeof lineUri === 'string' ? lineUri : '');
  const silImg = useImage(typeof silhouetteUri === 'string' ? silhouetteUri : '');
  const maskImg = useImage(maskUrl);

  const silhouetteForHair = silImg ?? lineImg;

  const baseSize = intrinsicSize ?? FALLBACK_STATIC_SIZE;
  const finalSize = baseSize * dbScale * scaleRatio;

  const centerX = (leftPercent / 100) * size;
  const centerY = (topPercent / 100) * size;

  const transform = [
    { translateX: centerX },
    { translateY: centerY },
    { rotate: (rotation * Math.PI) / 180 },
  ];

  const multiplyMatrix = useMemo(() => {
    if (!tintColor || hairFillHex) return null;
    const [r, g, b] = hexToRgb(tintColor);
    return [
      r, 0, 0, 0, 0,
      0, g, 0, 0, 0,
      0, 0, b, 0, 0,
      0, 0, 0, 1, 0,
    ];
  }, [tintColor, hairFillHex]);

  const hairStack =
    hairFillHex &&
    lineImg &&
    silhouetteForHair ? (
      <Group transform={transform}>
        <Mask
          mode="alpha"
          mask={
            <SkiaImage
              image={silhouetteForHair}
              x={-finalSize / 2}
              y={-finalSize / 2}
              width={finalSize}
              height={finalSize}
              fit="contain"
            />
          }
        >
          <Rect
            x={-finalSize / 2}
            y={-finalSize / 2}
            width={finalSize}
            height={finalSize}
            color={hairFillHex}
          />
        </Mask>
        <Group blendMode="multiply">
          <SkiaImage
            image={lineImg}
            x={-finalSize / 2}
            y={-finalSize / 2}
            width={finalSize}
            height={finalSize}
            fit="contain"
          />
        </Group>
      </Group>
    ) : null;

  const matrixStack = lineImg ? (
    <Group transform={transform}>
      <SkiaImage
        image={lineImg}
        x={-finalSize / 2}
        y={-finalSize / 2}
        width={finalSize}
        height={finalSize}
        fit="contain"
      >
        {multiplyMatrix && <ColorMatrix matrix={multiplyMatrix} />}
      </SkiaImage>
    </Group>
  ) : null;

  const itemContent = hairStack ?? matrixStack;

  if (!lineImg) {
    return (
      <View
        style={{
          position: 'absolute',
          zIndex,
          left: 0,
          top: 0,
          width: size,
          height: size,
          overflow: 'visible',
        }}
        pointerEvents="none"
      />
    );
  }

  if (!maskImg) {
    return (
      <View
        style={{
          position: 'absolute',
          zIndex,
          left: 0,
          top: 0,
          width: size,
          height: size,
          overflow: 'visible',
        }}
        pointerEvents="none"
        collapsable={false}
      >
        <WeaponAttackAnimatedInner
          attackKey={weaponAttack?.attackKey}
          attackPreset={weaponAttack?.preset ?? null}
          durationMs={weaponAttack?.durationMs ?? 500}
        >
          <Canvas style={{ width: size, height: size }}>{itemContent}</Canvas>
        </WeaponAttackAnimatedInner>
      </View>
    );
  }

  return (
    <View
      style={{
        position: 'absolute',
        zIndex,
        left: 0,
        top: 0,
        width: size,
        height: size,
        overflow: 'visible',
      }}
      pointerEvents="none"
      collapsable={false}
    >
      <WeaponAttackAnimatedInner
        attackKey={weaponAttack?.attackKey}
        attackPreset={weaponAttack?.preset ?? null}
        durationMs={weaponAttack?.durationMs ?? 500}
      >
        <Canvas style={{ width: size, height: size }}>
          <Mask
            mode="alpha"
            mask={
              <SkiaImage image={maskImg} x={0} y={0} width={size} height={size} fit="contain" />
            }
          >
            {itemContent}
          </Mask>
        </Canvas>
      </WeaponAttackAnimatedInner>
    </View>
  );
};

export default MaskedStaticOverlayLayer;
