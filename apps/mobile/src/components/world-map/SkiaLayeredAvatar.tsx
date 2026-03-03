import React, { useMemo } from 'react';
import {
  Group,
  Image as SkiaImage,
  useImage,
  ColorMatrix,
  vec,
  rect,
  Circle,
  rrect,
  FilterMode
} from '@shopify/react-native-skia';
import { 
  SharedValue, 
  useDerivedValue, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing,
  useAnimatedReaction,
  useFrameCallback
} from 'react-native-reanimated';

/** Helper to convert hex to RGB array [R, G, B] normalized 0-1 */
const hexToRgb = (hex: string) => {
  const clean = hex.replace(/^#/, '');
  if (clean.length !== 6) return [1, 1, 1];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
};

const ADMIN_CONTAINER_SIZE = 512;
const ADMIN_ANCHOR_POINT = 128;

interface SkiaLayerProps {
  uri: string;
  centerX: number;
  centerY: number;
  dbScale: number;
  scaleRatio: number;
  isBackground?: boolean;
  size: number;
  tintColor?: string;
  opacity?: number;
}

const SkiaLayer: React.FC<SkiaLayerProps> = ({ uri, centerX, centerY, dbScale, scaleRatio, isBackground, size, tintColor, opacity = 1 }) => {
  const skiaImg = useImage(uri ? uri : null);

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

  if (!uri || !skiaImg) return null;

  // INTRINSIC SIZING: Read the true pixel dimensions of the image!
  let finalSize = size;
  let finalX = 0;
  let finalY = 0;

  if (isBackground) {
    // Backgrounds force-fill the token
    finalX = 0;
    finalY = 0;
    finalSize = size;
  } else {
    // Match React Native's intrinsic size math perfectly
    const intrinsicSize = Math.max(skiaImg.width(), skiaImg.height());
    const baseSize = intrinsicSize > 0 ? intrinsicSize : 512;

    finalSize = baseSize * dbScale * scaleRatio;
    finalX = centerX - (finalSize / 2);
    finalY = centerY - (finalSize / 2);
  }

  return (
    <SkiaImage
      image={skiaImg}
      x={finalX}
      y={finalY}
      width={finalSize}
      height={finalSize}
      opacity={opacity}
      fit="contain"
      sampling={{ filter: FilterMode.Nearest }}
    >
      {multiplyMatrix && <ColorMatrix matrix={multiplyMatrix} />}
    </SkiaImage>
  );
};

// --- ANIMATED COSMETIC LAYER ---
interface SkiaAnimatedLayerProps {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tintColor?: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames?: number;
  fps?: number;
}

const SkiaAnimatedLayer: React.FC<SkiaAnimatedLayerProps> = ({ uri, x, y, width, height, tintColor, frameWidth, frameHeight, totalFrames = 4, fps = 10 }) => {
  const skiaImg = useImage(uri ? uri : null);
  const currentFrame = useSharedValue(0);
  const frameTimer = useSharedValue(0);

  // 1. The Game Loop for this specific item
  useFrameCallback((frameInfo) => {
    'worklet';
    if (!totalFrames || totalFrames <= 1 || fps <= 0) return;

    const dt = frameInfo.timeSincePreviousFrame || 0;
    const timePerFrame = 1000 / fps;

    frameTimer.value += dt;
    if (frameTimer.value >= timePerFrame) {
      currentFrame.value = (Math.floor(currentFrame.value) + 1) % totalFrames;
      frameTimer.value -= timePerFrame;
    }
  });

  // 2. Safely slide the spritesheet behind the clipping window
  const imageTransform = useDerivedValue(() => {
    const shiftX = Math.floor(currentFrame.value) * width;
    return [{ translateX: -shiftX }];
  });

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

  if (!uri || !skiaImg) return null;

  // Force the spritesheet to stretch exactly to our layout math; ignore physical PNG resolution.
  const fullSpriteWidth = width * (totalFrames || 1);
  const fullSpriteHeight = height;

  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      <Group clip={rect(0, 0, width, height)}>
        <SkiaImage
          image={skiaImg}
          x={0}
          y={0}
          width={fullSpriteWidth}
          height={fullSpriteHeight}
          transform={imageTransform}
          sampling={{ filter: FilterMode.Nearest }}
        >
          {multiplyMatrix && <ColorMatrix matrix={multiplyMatrix} />}
        </SkiaImage>
      </Group>
    </Group>
  );
};

interface SkiaLayeredAvatarProps {
  user: any;
  size?: number;
  isMoving: SharedValue<boolean>;
  activeDirection: SharedValue<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>;
  /** Pass SharedValues so we never read .value in render (avoids JS re-renders every frame). */
  x: SharedValue<number>;
  y: SharedValue<number>;
}

export const SkiaLayeredAvatar: React.FC<SkiaLayeredAvatarProps> = ({
  user,
  size = 48,
  isMoving,
  activeDirection,
  x,
  y,
}) => {
  const isFemale = (user?.gender || 'male').toLowerCase() === 'female';
  const scaleRatio = size / ADMIN_CONTAINER_SIZE;
  const breathScale = useSharedValue(1);

  // Breathing animation logic (idle only)
  useAnimatedReaction(
    () => isMoving.value,
    (currentlyMoving) => {
      if (currentlyMoving) {
        breathScale.value = withTiming(1, { duration: 150 });
      } else {
        breathScale.value = withRepeat(
          withSequence(
            withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 1250, easing: Easing.inOut(Easing.sin) })
          ),
          -1,
          true
        );
      }
    },
    [isMoving] // Dep array for reaction setup only
  );

  // 1. Gather all equipped cosmetics
  const equippedCosmetics = user?.cosmetics?.filter((c: any) => c.equipped) || [];
  
  // 2. Identify the base look (Unique Avatar or Base Body)
  const equippedAvatarItem = equippedCosmetics.find((c: any) => c.shop_items?.slot === 'avatar');
  const equippedBaseBodyItem = equippedCosmetics.find((c: any) => c.shop_items?.slot === 'base_body');
  const activeSkinItem = equippedAvatarItem || equippedBaseBodyItem;
  
  const baseBodyImage = activeSkinItem?.shop_items?.image_url || user?.base_body_url || user?.avatar_url;
  const activeSkinColor = activeSkinItem?.shop_items?.skin_tint_hex || user?.base_body_tint_hex || "#FFDBAC";
  const isBaseBody = activeSkinItem?.shop_items?.slot === 'base_body';
  const useSkiaTint = !!(isBaseBody && activeSkinColor);

  // 3. Build the sorted layers list (porting LayeredAvatar Internal logic)
  const sortedLayers = useMemo(() => {
    const layers: any[] = [];
    
    // Add Base Body (isBackground = sizing; skipBreathing = false so it still flips with direction)
    if (baseBodyImage) {
      const centerX = size / 2;
      const centerY = size / 2;
      layers.push({
        id: 'base-body',
        uri: baseBodyImage,
        x: 0,
        y: 0,
        width: size,
        height: size,
        centerX,
        centerY,
        dbScale: 1,
        scaleRatio,
        isBackground: true,
        skipBreathing: false,
        zIndex: 0,
        tintColor: useSkiaTint ? activeSkinColor : undefined
      });
    }

    // Add Overlay Cosmetics
    equippedCosmetics.forEach((cosmetic: any) => {
      const item = cosmetic.shop_items;
      
      // ALLOW 'background' slot to pass through!
      if (!item || item.slot === 'avatar' || item.slot === 'base_body') return;

      // Replace existing offsetX/Y and scale with these safe versions
      const rawScale = (isFemale && item.scale_female !== null && item.scale_female !== undefined) ? item.scale_female : item.scale;
      const scale = Number(rawScale) || 1; // Number() + || 1 is safer than parseFloat

      const rawX = (isFemale && item.offset_x_female !== null && item.offset_x_female !== undefined) ? item.offset_x_female : item.offset_x;
      const offsetX = Number(rawX) || 0;

      const rawY = (isFemale && item.offset_y_female !== null && item.offset_y_female !== undefined) ? item.offset_y_female : item.offset_y;
      const offsetY = (Number(rawY) || 0) + (item.slot === 'hand_grip' ? 10 : 0);
      
      const isHandGrip = item.slot === 'hand_grip';
      const tintColor = isHandGrip ? activeSkinColor : undefined;

      // ANIMATION CONFIG PARSER — support both camelCase and snake_case (Supabase can return either)
      let isAnimated = false;
      let frameWidth = 512;
      let frameHeight = 512;
      let totalFrames = 4;
      let fps = 10;

      if (item.is_animated && item.animation_config) {
        try {
          let config: any = item.animation_config;
          if (typeof config === 'string') {
            if (config.trim().startsWith('{')) {
              config = JSON.parse(config);
              if (typeof config === 'string' && config.trim().startsWith('{')) {
                config = JSON.parse(config);
              }
            } else {
              config = {};
            }
          }
          if (config && typeof config === 'object') {
            const w = config.frameWidth ?? config.frame_width;
            const h = config.frameHeight ?? config.frame_height;
            if (w != null && h != null) {
              frameWidth = Number(w) || 512;
              frameHeight = Number(h) || 512;
              isAnimated = true;
            }
            const total = config.totalFrames ?? config.frame_count ?? config.total_frames;
            if (total != null) totalFrames = Math.max(1, Number(total) || 4);
            const fpsVal = config.fps ?? (config.duration_ms != null && total != null && Number(total) > 1
              ? (Number(total) * 1000) / Number(config.duration_ms)
              : null);
            if (fpsVal != null) fps = Math.max(1, Number(fpsVal) || 10);
          }
        } catch (e) { console.warn('Animation parse error:', e); }
      }

      // MATHEMATICALLY PERFECT PORT OF YOUR RN SYSTEM:
      // 1. Calculate the percentage position of the anchor center
      const leftPercent = (ADMIN_ANCHOR_POINT + offsetX) / ADMIN_CONTAINER_SIZE;
      const topPercent = (ADMIN_ANCHOR_POINT + offsetY) / ADMIN_CONTAINER_SIZE;

      // 2. Map percentage to the actual pixel center in our Skia container
      const centerX = leftPercent * size;
      const centerY = topPercent * size;

      // 3. Final layer size based on scale
      // CRITICAL FIX: Animated layers use their frame dimensions as the base size.
      // If frameWidth is 512, layerWidth becomes 512 * scale * (size/512).
      const layerWidth = isAnimated 
        ? (frameWidth * scale * scaleRatio) 
        : (size * scale);
      
      const layerHeight = isAnimated 
        ? (frameHeight * scale * scaleRatio) 
        : (size * scale);

      // 4. Skia draws from top-left, so subtract half width/height from the center
      const lx = centerX - (layerWidth / 2);
      const ly = centerY - (layerHeight / 2);

      const isBackgroundSlot = item.slot === 'background';
      const calculatedZIndex = isBackgroundSlot ? -10 : Number(item.z_index || 10);

      layers.push({
        id: cosmetic.id,
        uri: item.image_url,
        x: lx,
        y: ly,
        width: layerWidth,
        height: layerHeight,
        centerX,
        centerY,
        dbScale: scale,
        scaleRatio,
        isBackground: isBackgroundSlot,
        skipBreathing: isBackgroundSlot,
        zIndex: calculatedZIndex,
        tintColor,
        isAnimated,
        frameWidth,
        frameHeight,
        totalFrames,
        fps
      });
    });

    return layers.sort((a, b) => a.zIndex - b.zIndex);
  }, [user, size, isFemale, scaleRatio, activeSkinColor, useSkiaTint, baseBodyImage, equippedCosmetics]);

  const rootTransform = useDerivedValue(() => {
    const tx = x.value;
    const ty = y.value;
    return [{ translateX: tx }, { translateY: ty }];
  });

  // 1. MEMORY: Remembers direction when D-Pad is released (1 = Left, -1 = Right)
  const lastFacingDir = useSharedValue(1); 

  const breathingTransform = useDerivedValue(() => {
    // Default to RIGHT (1) if undefined to prevent crash
    const dir = activeDirection ? activeDirection.value : null;
    
    // 2. Only update memory if ACTIVELY holding a direction
    if (dir === 'RIGHT') lastFacingDir.value = -1;
    else if (dir === 'LEFT') lastFacingDir.value = 1;
    
    const sY = Number(breathScale?.value) || 1;

    return [
      { scaleX: lastFacingDir.value },
      { scaleY: sY }
    ];
  });

  const radius = (size ?? 48) / 2;

  return (
    <Group transform={rootTransform}>
      {/* 1. Static Background Fill (Does NOT Breathe) */}
      <Circle cx={radius} cy={radius} r={radius} color="#0f172a" />

      {/* 2. Avatar Layers: background slot does NOT breathe; rest breathe & flip */}
      <Group clip={rrect(rect(0, 0, size ?? 48, size ?? 48), radius, radius)}>
        {sortedLayers.map((layer) => {
          const layerContent = layer.isAnimated ? (
            <SkiaAnimatedLayer
              key={layer.id}
              uri={layer.uri}
              x={layer.x}
              y={layer.y}
              width={layer.width}
              height={layer.height}
              tintColor={layer.tintColor}
              frameWidth={layer.frameWidth}
              frameHeight={layer.frameHeight}
              totalFrames={layer.totalFrames}
              fps={layer.fps}
            />
          ) : (
            <SkiaLayer
              key={layer.id}
              uri={layer.uri}
              centerX={layer.centerX}
              centerY={layer.centerY}
              dbScale={layer.dbScale}
              scaleRatio={layer.scaleRatio}
              isBackground={layer.isBackground}
              size={size ?? 48}
              tintColor={layer.tintColor}
            />
          );

          return layer.skipBreathing ? (
            <Group key={layer.id}>{layerContent}</Group>
          ) : (
            <Group
              key={layer.id}
              transform={breathingTransform}
              origin={vec(radius, size ?? 48)}
            >
              {layerContent}
            </Group>
          );
        })}
      </Group>

      {/* 3. Static Border Stroke (Does NOT Breathe) */}
      <Circle cx={radius} cy={radius} r={radius} color="#3b82f6" style="stroke" strokeWidth={2} />
    </Group>
  );
};
