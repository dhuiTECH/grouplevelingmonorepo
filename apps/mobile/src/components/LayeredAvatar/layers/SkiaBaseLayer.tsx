import React, { useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Canvas, Image as SkiaImage, useImage, ColorMatrix, Mask } from '@shopify/react-native-skia';
import { hexToRgb } from '../LayeredAvatarUtils';

/** Skia layer for base bodies that fills the parent size (no offset math required) */
const SkiaBaseLayer: React.FC<{
  uri: string;
  tintColor?: string;
  size: number;
  maskUrl?: string;
}> = ({ uri, tintColor, size, maskUrl }) => {
  const skiaImg = useImage(uri);
  const maskImg = useImage(maskUrl ? maskUrl : null);
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
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        pointerEvents="none"
      >
        <ActivityIndicator size="small" color="#22d3ee" />
      </View>
    );
  }

  const imageLayer = (
    <SkiaImage
      image={skiaImg}
      fit="contain"
      x={0}
      y={0}
      width={size}
      height={size}
    >
      {multiplyMatrix && <ColorMatrix matrix={multiplyMatrix} />}
    </SkiaImage>
  );

  if (maskUrl && maskImg) {
    return (
      <Canvas style={{ width: size, height: size }} pointerEvents="none">
        <Mask
          mode="alpha"
          mask={
            <SkiaImage image={maskImg} x={0} y={0} width={size} height={size} fit="contain" />
          }
        >
          {imageLayer}
        </Mask>
      </Canvas>
    );
  }

  return (
    <Canvas 
      style={{ width: size, height: size }}
      pointerEvents="none"
    >
      {imageLayer}
    </Canvas>
  );
};

export default SkiaBaseLayer;
