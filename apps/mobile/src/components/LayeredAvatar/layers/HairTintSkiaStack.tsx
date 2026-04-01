import React, { useState } from 'react';
import { View, LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import {
  Canvas,
  Group,
  Image as SkiaImage,
  Mask,
  Rect,
  useImage,
} from '@shopify/react-native-skia';

type Fit = 'contain' | 'cover' | 'fill';

/**
 * Matches web AvatarBuilder / LayeredAvatar hair: solid fill in the silhouette shape
 * (CSS mask + backgroundColor), then line art with multiply blend — not template tintColor.
 */
export function HairTintSkiaStack({
  maskUri,
  lineUri,
  fillHex,
  style,
  fit = 'contain',
}: {
  maskUri: string;
  lineUri: string;
  fillHex: string;
  style?: StyleProp<ViewStyle>;
  fit?: Fit;
}) {
  const [layout, setLayout] = useState({ w: 1, h: 1 });
  const maskImg = useImage(maskUri);
  const lineImg = useImage(lineUri);
  const skiaFit = fit === 'fill' ? 'fill' : fit;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 1 && height > 1) {
      setLayout({ w: width, h: height });
    }
  };

  const { w, h } = layout;

  if (!maskImg || !lineImg) {
    return <View style={style} onLayout={onLayout} />;
  }

  return (
    <View style={style} onLayout={onLayout}>
      <Canvas style={{ width: w, height: h }}>
        <Mask
          mode="alpha"
          mask={
            <SkiaImage
              image={maskImg}
              x={0}
              y={0}
              width={w}
              height={h}
              fit={skiaFit}
            />
          }
        >
          <Rect x={0} y={0} width={w} height={h} color={fillHex} />
        </Mask>
        <Group blendMode="multiply">
          <SkiaImage image={lineImg} x={0} y={0} width={w} height={h} fit={skiaFit} />
        </Group>
      </Canvas>
    </View>
  );
}
