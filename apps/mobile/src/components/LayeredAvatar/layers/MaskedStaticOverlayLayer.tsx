import React, { useState, useEffect, useMemo } from 'react';
import { View, Image as RNImage } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, ColorMatrix, Group, Mask } from '@shopify/react-native-skia';
import { FALLBACK_STATIC_SIZE, hexToRgb } from '../LayeredAvatarUtils';

/** 
 * A hybrid layer that renders an item onto a full-size Skia canvas, 
 * then punches a hole in it using a global mask with dstOut blend mode.
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
}> = ({ item, maskUrl, leftPercent, topPercent, zIndex, dbScale, scaleRatio, rotation, size, tintColor }) => {
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

  const skiaImg = useImage(uri);
  const maskImg = useImage(maskUrl);

  const baseSize = intrinsicSize ?? FALLBACK_STATIC_SIZE;
  const finalSize = baseSize * dbScale * scaleRatio;
  
  // Calculate coordinates in the full-size canvas
  const centerX = (leftPercent / 100) * size;
  const centerY = (topPercent / 100) * size;

  const multiplyMatrix = useMemo(() => {
    if (!tintColor) return null;
    const [r, g, b] = hexToRgb(tintColor);
    return [
      r, 0, 0, 0, 0,
      0, g, 0, 0, 0,
      0, 0, b, 0, 0,
      0, 0, 0, 1, 0,
    ];
  }, [tintColor]);

  if (!skiaImg) {
    return (
      <View 
        style={{ 
          position: 'absolute', 
          zIndex, 
          left: 0, 
          top: 0, 
          width: size, 
          height: size 
        }} 
        pointerEvents="none" 
      />
    );
  }

  // Pre-calculate the item drawing logic so we can reuse it
  const itemContent = (
    <Group
      transform={[
        { translateX: centerX },
        { translateY: centerY },
        { rotate: (rotation * Math.PI) / 180 },
      ]}
    >
      <SkiaImage
        image={skiaImg}
        x={-finalSize / 2}
        y={-finalSize / 2}
        width={finalSize}
        height={finalSize}
        fit="contain"
      >
        {multiplyMatrix && <ColorMatrix matrix={multiplyMatrix} />}
      </SkiaImage>
    </Group>
  );

  // Fallback: If the mask is still downloading over the network, render the item normally!
  if (!maskImg) {
    return (
      <View 
        style={{ 
          position: 'absolute', 
          zIndex, 
          left: 0, 
          top: 0, 
          width: size, 
          height: size 
        }} 
        pointerEvents="none"
      >
        <Canvas style={{ width: size, height: size }}>
          {itemContent}
        </Canvas>
      </View>
    );
  }

  // Final: Both images loaded, apply the surgical mask!
  return (
    <View style={{ position: 'absolute', zIndex: zIndex, left: 0, top: 0, width: size, height: size }} pointerEvents="none">
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
    </View>
  );
};

export default MaskedStaticOverlayLayer;
