import React from 'react';
import { Group, Image, rect, SkImage } from '@shopify/react-native-skia';
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
  
  // We make the drawn image N times wider than the destination rectangle.
  const fullWidth = destRect.width * safeFrames;
  const fullHeight = destRect.height;
  
  // Render the full strip starting at the same origin as the destRect
  const fullRect = rect(destRect.x, destRect.y, fullWidth, fullHeight);

  // We animate the transform to slide the image left, revealing different frames through the clip window
  const transform = useDerivedValue(() => {
    // animationFrame is elapsed time in seconds.
    const safeDuration = durationSecs > 0 ? durationSecs : 1;
    const progress = (animationFrame.value % safeDuration) / safeDuration;
    const frameIndex = Math.floor(progress * safeFrames) % safeFrames;
    
    // VERY IMPORTANT: Do NOT use absolute pixels based on full width.
    // Instead, shift by exactly the width of ONE frame (destRect.width) multiplied by the frameIndex.
    // If the image is natively huge (e.g., 2048px), destRect.width will be scaled down (e.g. 192px).
    // This ensures we always move exactly one visual frame over.
    return [{ translateX: -frameIndex * destRect.width }];
  });

  return (
    <Group clip={destRect}>
      <Group transform={transform}>
        {/* We use fit="fill" so the full strip perfectly stretches across the N * destRect.width area */}
        <Image image={image} rect={fullRect} fit="fill" />
      </Group>
    </Group>
  );
};
