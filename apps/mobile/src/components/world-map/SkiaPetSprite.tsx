import React, { useMemo } from 'react';
import { 
  Group, 
  Image as SkiaImage, 
  useImage, 
  rect,
  useClock,
  SkRect
} from '@shopify/react-native-skia';
import { 
  SharedValue, 
  useDerivedValue, 
  useFrameCallback, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing,
  useAnimatedReaction,
  cancelAnimation
} from 'react-native-reanimated';

interface SkiaPetSpriteProps {
  imageUrl: string;
  isMoving: SharedValue<boolean>;
  activeDirection?: SharedValue<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>; // Optional to not break other usages
  flipX: boolean;
  scale?: number;
  totalFrames?: number;
  totalTimeMs?: number;
  frameWidth?: number;
  frameHeight?: number;
  idleIndex?: number;
  x?: number;
  y?: number;
  trailX?: SharedValue<number>;
  trailY?: SharedValue<number>;
}

export const SkiaPetSprite: React.FC<SkiaPetSpriteProps> = ({
  imageUrl,
  isMoving,
  activeDirection,
  flipX,
  scale = 1,
  totalFrames = 1,
  totalTimeMs = 1000,
  frameWidth = 48,
  frameHeight = 48,
  idleIndex = 0,
  x = 0,
  y = 0,
  trailX,
  trailY
}) => {
  const skiaImg = useImage(imageUrl ? imageUrl : null);
  const currentFrame = useSharedValue(idleIndex);
  const frameTimer = useSharedValue(0);
  const breathScale = useSharedValue(1);

  // Breathing animation logic (idle only)
  useAnimatedReaction(
    () => isMoving.value,
    (moving) => {
      if (moving) {
        cancelAnimation(breathScale);
        breathScale.value = withTiming(1, { duration: 150 });
      } else {
        breathScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
      }
    },
    [isMoving]
  );

  useFrameCallback((frameInfo) => {
    'worklet';
    // 1. MODULO SAFETY: Prevent division by zero if props are missing
    if (!totalFrames || totalFrames <= 0) return; 
    
    const moving = isMoving.value;
    const timePerFrame = totalTimeMs / totalFrames;
    const dt = frameInfo.timeSincePreviousFrame || 0;

    if (moving) {
      frameTimer.value += dt;
      if (frameTimer.value >= timePerFrame) {
        // Use a safe floor and modulo
        currentFrame.value = (Math.floor(currentFrame.value) + 1) % totalFrames;
        frameTimer.value -= timePerFrame;
      }
    } else {
      currentFrame.value = idleIndex || 0;
      frameTimer.value = 0;
    }
  });

  // We use Skia's Atlas or just manual rect calculation if src/dest isn't playing nice.
  // Actually, standard Image with x,y,width,height works if we just want to draw the whole thing.
  // But for spritesheet, we need `src` and `dest`.
  // Skia's <Image> component DOES support `src` and `dest` but the type checking might be strict about Reanimated values.
  
  // Let's use the standard subset approach: 
  // We can't easily animate `src` rect with Reanimated in standard Skia Image without `useDerivedValue` which we tried.
  // The error "Property 'src' does not exist" suggests we might be using an older Skia version or the types are strict.
  // Let's use <Atlas> or just simple integer math if possible? No, we need animation.
  
  // Alternative: Use `SkiaImage` with `subset`? No.
  
  // Let's try the strict type fix:
  // If `src` is not allowed on Image, we must use `Atlas` or `drawAtlas` logic, OR just use the `rect` prop?
  // Wait, `Image` in `@shopify/react-native-skia` definitely has `x, y, width, height` but maybe not `src`.
  
  // CORRECT APPROACH for Spritesheets in simple Skia:
  // We cannot easily crop an Image component.
  // We should use `Atlas` for efficient spritesheets, BUT for a single sprite, we can cheat:
  // Draw the image inside a clipping group, shifted by `-frameX`.
  
  // --- SAFE SPRITESHEET CLIPPING ---
  
  // 1. The bounding box of the pet (The "Window")
  const petClipRect = useMemo(() => {
    const w = frameWidth * scale;
    const h = frameHeight * scale;
    // Center the clipping window at (0,0)
    return rect(-w / 2, -h / 2, w, h);
  }, [frameWidth, frameHeight, scale]);

  // 2. Slide the giant image behind the window based on the current frame
  const imageTransform = useDerivedValue(() => {
    // Shift the image left by (currentFrame * displayWidth)
    const shiftX = Math.floor(currentFrame.value) * (frameWidth * scale);
    return [{ translateX: -shiftX }];
  });

  // 1. MEMORY: Remembers pet direction when D-Pad is released
  const lastFacingDir = useSharedValue(1);

  const petTransform = useDerivedValue(() => {
    const dir = activeDirection?.value;
    
    // 2. Only update memory if ACTIVELY holding a direction
    if (dir === 'RIGHT') lastFacingDir.value = -1;
    else if (dir === 'LEFT') lastFacingDir.value = 1;

    // 3. Apply the base flipX prop if the native sprite faces the opposite way
    const sX = lastFacingDir.value * (flipX ? -1 : 1); 
    const sY = Number(breathScale?.value) || 1;
    const tx = Number(x) || 0;
    const ty = Number(y) || 0;
    
    // Read the smooth rubber-band physics passed from the game loop
    const offsetX = trailX ? Number(trailX.value) : 0;
    const offsetY = trailY ? Number(trailY.value) : 0;
    
    return [
        { translateX: tx + offsetX }, 
        { translateY: ty + offsetY }, 
        { scaleX: sX }, // Uses the memory value with flipX applied
        { scaleY: sY }
      ];
  });

  if (!skiaImg) return null;

  return (
    <Group transform={petTransform}>
      {/* The Clipping Window */}
      <Group clip={petClipRect}>
        <SkiaImage
          image={skiaImg}
          // Start the image perfectly aligned with the clipping window
          x={-(frameWidth * scale) / 2}
          y={-(frameHeight * scale) / 2}
          // The image size is the ENTIRE spritesheet
          width={skiaImg.width() * scale}
          height={skiaImg.height() * scale}
          // Slide the image to reveal the correct frame safely
          transform={imageTransform}
          // Force hard pixel edges to prevent shimmering
          sampling="nearest" 
        />
      </Group>
    </Group>
  );
};
