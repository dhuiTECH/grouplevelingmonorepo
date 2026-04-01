import React from 'react';
import { Group, Image, rect, SkImage, Paint, FilterMode } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';

interface SkiaSpritesheetProps {
  image: SkImage;
  numFrames: number;
  durationSecs: number;
  destRect: any;
  animationFrame: SharedValue<number>;
}

export const SkiaSpritesheet: React.FC<SkiaSpritesheetProps> = ({
  image, numFrames, durationSecs, destRect, animationFrame
}) => {
  const safeFrames = Math.max(1, numFrames);

  // One frame width in local space — round to reduce float noise from tileSize/frame scaling.
  const frameStep = Math.round(destRect.width * 10000) / 10000;

  // We make the drawn image N times wider than the destination rectangle.
  const fullWidth = frameStep * safeFrames;
  const fullHeight = destRect.height;

  // Render the full strip starting at the same origin as the destRect
  const fullRect = rect(destRect.x, destRect.y, fullWidth, fullHeight);

  // We animate the transform to slide the image left, revealing different frames through the clip window
  const transform = useDerivedValue(() => {
    // animationFrame is elapsed time in seconds.
    const safeDuration = durationSecs > 0 ? durationSecs : 1;
    const progress = (animationFrame.value % safeDuration) / safeDuration;
    const frameIndex = Math.floor(progress * safeFrames) % safeFrames;

    // Integer-pixel shift (frameStep) — reduces strip vs clip mismatch with Nearest + scaled camera.
    const offsetX = -Math.round(frameIndex * frameStep);
    return [{ translateX: offsetX }];
  });

  return (
    <Group clip={destRect}>
      <Paint antiAlias={false} />
      <Group transform={transform}>
        {/* We use fit="fill" so the full strip stretches across frameStep * numFrames wide */}
        <Image image={image} rect={fullRect} fit="fill" sampling={{ filter: FilterMode.Nearest }} antiAlias={false} />
      </Group>
    </Group>
  );
};
