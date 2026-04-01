import React, { useMemo } from 'react';
import { DEFAULT_HAIR_TINT_HEX } from '@repo/avatar-constants';
import {
  Group,
  Image as SkiaImage,
  useImage,
  ColorMatrix,
  vec,
  rect,
  Circle,
  rrect,
  FilterMode,
  Mask
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

function getEffectiveGender(item: any, fallbackGender?: string): 'male' | 'female' {
  const fallback = (fallbackGender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
  if (!item?.gender) return fallback;

  let genders: string[] = [];
  try {
    if (typeof item.gender === 'string' && item.gender.startsWith('[')) {
      genders = JSON.parse(item.gender);
    } else if (Array.isArray(item.gender)) {
      genders = item.gender;
    } else {
      genders = [item.gender];
    }
  } catch {
    genders = [item.gender];
  }

  const normalized = genders.map((gender: string) => String(gender).toLowerCase());
  if (normalized.includes('female') && !normalized.includes('male')) return 'female';
  if (normalized.includes('male') && !normalized.includes('female')) return 'male';
  return fallback;
}

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
  maskUrl?: string;
  rotation?: number;
}

const SkiaLayer: React.FC<SkiaLayerProps> = ({ uri, centerX, centerY, dbScale, scaleRatio, isBackground, size, tintColor, opacity = 1, maskUrl, rotation = 0 }) => {
  const skiaImg = useImage(uri ? uri : null);
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

  const imageLayer = (
    <Group 
      transform={rotation ? [{ rotate: (rotation * Math.PI) / 180 }] : []}
      origin={rotation ? { x: centerX, y: centerY } : undefined}
    >
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
    </Group>
  );

  if (maskUrl && maskImg) {
    return (
      <Mask
        mode="alpha"
        mask={
          <SkiaImage image={maskImg} x={0} y={0} width={size} height={size} fit="contain" />
        }
      >
        {imageLayer}
      </Mask>
    );
  }

  return imageLayer;
};

// --- ANIMATED COSMETIC LAYER ---
interface SkiaAnimatedLayerProps {
  uri: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  tintColor?: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames?: number;
  fps?: number;
  maskUrl?: string;
  size: number; // Needed for global mask
  rotation?: number;
}

const SkiaAnimatedLayer: React.FC<SkiaAnimatedLayerProps> = ({ uri, x, y, width, height, centerX, centerY, tintColor, frameWidth, frameHeight, totalFrames = 4, fps = 10, maskUrl, size, rotation = 0 }) => {
  const skiaImg = useImage(uri ? uri : null);
  const maskImg = useImage(maskUrl ? maskUrl : null);
  const currentFrame = useSharedValue(0);
  const frameTimer = useSharedValue(0);

  // 1. The Game Loop: Robust "Catch-up" logic for smooth animation even during lag
  useFrameCallback((frameInfo) => {
    'worklet';
    if (!totalFrames || totalFrames <= 1 || fps <= 0) return;

    const dt = frameInfo.timeSincePreviousFrame || 0;
    const timePerFrame = 1000 / fps;

    frameTimer.value += dt;
    if (frameTimer.value >= timePerFrame) {
      // Robust catch-up: increment multiple frames if needed
      const framesToAdvance = Math.floor(frameTimer.value / timePerFrame);
      currentFrame.value = (Math.floor(currentFrame.value) + framesToAdvance) % totalFrames;
      frameTimer.value -= framesToAdvance * timePerFrame;
    }
  });

  // 2. FIXED: Match AnimatedEquip logic exactly
  // Standard top-left clipping window
  const actualFrameWidth = skiaImg 
    ? (skiaImg.width() / totalFrames) * (width / frameWidth) 
    : width;

  const clipRect = useMemo(() => rect(0, 0, width, height), [width, height]);

  const imageTransform = useDerivedValue(() => {
    // Shift by exactly one frame width per index
    const shiftX = Math.floor(currentFrame.value) * actualFrameWidth;
    return [{ translateX: -shiftX }];
  }, [actualFrameWidth]);

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

  // Calculate scaling factor to match the intended display width
  const imgW = skiaImg.width();
  const imgH = skiaImg.height();
  
  // 3. SCALE CALCULATION: Scale based on physical frame dimensions, NOT totalFrames.
  // This ensures frames align perfectly even if the PNG has extra padding pixels at the end.
  const scaleX = width / frameWidth;
  const scaleY = height / frameHeight;

  const animLayer = (
    <Group 
      transform={rotation ? [{ rotate: (rotation * Math.PI) / 180 }] : []}
      origin={{ x: centerX, y: centerY }}
    >
      <Group transform={[{ translateX: x }, { translateY: y }]}>
        <Group clip={clipRect}>
          <SkiaImage
            image={skiaImg}
            x={0}
            y={0}
            width={imgW * scaleX}
            height={imgH * scaleY}
            transform={imageTransform}
            sampling={{ filter: FilterMode.Nearest }}
          >
            {multiplyMatrix && <ColorMatrix matrix={multiplyMatrix} />}
          </SkiaImage>
        </Group>
      </Group>
    </Group>
  );

  if (maskUrl && maskImg) {
    return (
      <Mask
        mode="alpha"
        mask={
          <SkiaImage image={maskImg} x={0} y={0} width={size} height={size} fit="contain" />
        }
      >
        {animLayer}
      </Mask>
    );
  }

  return animLayer;
};

interface SkiaLayeredAvatarProps {
  user: any;
  size?: number;
  isMoving: SharedValue<boolean>;
  activeDirection: SharedValue<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>;
  /** Pass SharedValues so we never read .value in render (avoids JS re-renders every frame). */
  x: SharedValue<number>;
  y: SharedValue<number>;
  allShopItems?: any[];
}

export const SkiaLayeredAvatar: React.FC<SkiaLayeredAvatarProps> = ({
  user,
  size = 48,
  isMoving,
  activeDirection,
  x,
  y,
  allShopItems = [],
}) => {
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

  // Helper to normalize slot names
  const getSlot = (item: any) => item?.slot?.trim().toLowerCase();

  // 2. Identify the base look (Unique Avatar or Base Body)
  const equippedAvatarItem = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'avatar');
  const equippedBaseBodyItem = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'base_body');
  const activeSkinItem = equippedAvatarItem || equippedBaseBodyItem;
  const activeVisualGender = getEffectiveGender(activeSkinItem?.shop_items, user?.gender);

  // 1.5. Extract Active Masks using the active rendered body/avatar gender
  const activeMasks = useMemo(() => {
    const masks: { url: string; targets: string[] }[] = [];
    const shouldUseFemaleMask = activeVisualGender === 'female';
    
    equippedCosmetics.forEach((c: any) => {
      const item = c.shop_items;
      const maskUrl = (shouldUseFemaleMask && item?.eraser_mask_url_female) ? item.eraser_mask_url_female : item?.eraser_mask_url;
      
      if (maskUrl && item?.eraser_mask_targets) {
        const targets = Array.isArray(item.eraser_mask_targets) 
          ? item.eraser_mask_targets 
          : [item.eraser_mask_targets];
          
        if (targets.length > 0) {
          masks.push({
            url: maskUrl,
            targets: targets.map((t: any) => String(t).toLowerCase().trim()),
          });
        }
      }
    });
    return masks;
  }, [activeVisualGender, equippedCosmetics]);
  
  const baseBodyImage = activeSkinItem?.shop_items?.image_url || user?.base_body_url || user?.avatar_url;
  const activeSkinColor = activeSkinItem?.shop_items?.skin_tint_hex || user?.base_body_tint_hex || "#FFDBAC";
  const isBaseBody = getSlot(activeSkinItem?.shop_items) === 'base_body';
  const useSkiaTint = !!(isBaseBody && activeSkinColor);

  // 2.5 Find equipped weapon to determine hand grip z-index override
  const equippedWeapon = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'weapon');
  const handGripZIndexOverride = equippedWeapon?.shop_items?.hand_grip_z_index_override;

  // 2.6 Hand Grip Auto-Detection Logic (ported from LayeredAvatar/index.tsx)
  let handGripCosmetic = null;
  if (equippedWeapon?.shop_items?.grip_type) {
    const gripType = equippedWeapon.shop_items.grip_type;
    
    // Get the gender of the ACTIVE skin item
    const getGenderArray = (item: any) => {
      if (!item?.gender) return [(user?.gender || 'male').toLowerCase()];
      
      let gendersArray = [];
      try {
        if (typeof item.gender === 'string' && item.gender.startsWith('[')) {
          gendersArray = JSON.parse(item.gender);
        } else if (Array.isArray(item.gender)) {
          gendersArray = item.gender;
        } else {
          gendersArray = [item.gender];
        }
      } catch(e) {
        gendersArray = [item.gender];
      }
      
      return gendersArray.map((g: string) => g?.toLowerCase());
    };
    
    const activeSkinGenders = getGenderArray(activeSkinItem?.shop_items);

    // Helper function to check gender match for hand grip
    const isGenderMatch = (item: any) => {
      if (!item.gender) return true;
      
      let itemGendersArray = [];
      try {
        if (typeof item.gender === 'string' && item.gender.startsWith('[')) {
          itemGendersArray = JSON.parse(item.gender);
        } else if (Array.isArray(item.gender)) {
          itemGendersArray = item.gender;
        } else {
          itemGendersArray = [item.gender];
        }
      } catch(e) {
        itemGendersArray = [item.gender];
      }
      
      const itemGenders = itemGendersArray.map((g: string) => g?.toLowerCase());
      
      return itemGenders.includes('unisex') || 
             itemGenders.includes('all') || 
             itemGenders.some((g: string) => activeSkinGenders.includes(g));
    };

    // Try to find in user's owned cosmetics OR global shop items
    const matchingOwned = user?.cosmetics?.find((c: any) => {
        const item = c.shop_items;
        return getSlot(item) === 'hand_grip' && 
               item.grip_type?.toLowerCase() === gripType.toLowerCase() &&
               isGenderMatch(item);
    });

    if (matchingOwned) {
        handGripCosmetic = matchingOwned;
    } else if (allShopItems && allShopItems.length > 0) {
        const matchingShopItem = allShopItems?.find((item: any) => {
            return getSlot(item) === 'hand_grip' && 
                   item.grip_type?.toLowerCase() === gripType.toLowerCase() &&
                   isGenderMatch(item);
        });
        if (matchingShopItem) {
            handGripCosmetic = {
                id: `ghost-hand-${gripType}`,
                user_id: user.id,
                shop_item_id: matchingShopItem.id,
                created_at: new Date().toISOString(),
                equipped: true, // Mark as virtually equipped so it renders
                shop_items: matchingShopItem
            };
        }
    }
  }

  // Combine explicitly equipped cosmetics with our ghost hand grip (if any)
  const finalEquippedCosmetics = [...equippedCosmetics];
  
  if (handGripCosmetic && !finalEquippedCosmetics.find(c => c.id === handGripCosmetic.id)) {
    finalEquippedCosmetics.push({
      ...handGripCosmetic,
      equipped: true,
    });
  }

  // 3. Build the sorted layers list (porting LayeredAvatar Internal logic)
  const sortedLayers = useMemo(() => {
    const layers: any[] = [];
    const isFemale = activeVisualGender === 'female';
    
    // Add Base Body (isBackground = sizing; skipBreathing = false so it still flips with direction)
    if (baseBodyImage) {
      const centerX = size / 2;
      const centerY = size / 2;
      
      const activeMask = activeMasks.find(m => m.targets.includes('base_body') || m.targets.includes('avatar'));
      const maskUrl = activeMask?.url;

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
        tintColor: useSkiaTint ? activeSkinColor : undefined,
        maskUrl
      });
    }

    // Add Overlay Cosmetics
    finalEquippedCosmetics.forEach((cosmetic: any) => {
      const item = cosmetic.shop_items;
      
      // ALLOW 'background' slot to pass through!
      const slot = getSlot(item);
      if (!item || slot === 'avatar' || slot === 'base_body') return;

      // Replace existing offsetX/Y and scale with these safe versions
      const rawScale = (isFemale && item.scale_female !== null && item.scale_female !== undefined) ? item.scale_female : item.scale;
      const scale = Number(rawScale) || 1; // Number() + || 1 is safer than parseFloat

      const rawX = (isFemale && item.offset_x_female !== null && item.offset_x_female !== undefined) ? item.offset_x_female : item.offset_x;
      const offsetX = Number(rawX) || 0;

      const rawY = (isFemale && item.offset_y_female !== null && item.offset_y_female !== undefined) ? item.offset_y_female : item.offset_y;
      const offsetY = Number(rawY) || 0;
      
      const rawRotation = (isFemale && item.rotation_female !== null && item.rotation_female !== undefined) ? item.rotation_female : item.rotation;
      const rotation = Number(rawRotation) || 0;
      
      const isHandGrip = slot === 'hand_grip';
      const hairHex =
        slot === 'hair'
          ? (user?.hair_tint_hex?.trim() || item.skin_tint_hex || DEFAULT_HAIR_TINT_HEX)
          : null;
      const tintColor = isHandGrip ? activeSkinColor : undefined;

      // MATCHED UI PARSING:
      let isAnimated = false;
      let frameWidth = 96;
      let frameHeight = 96;
      let totalFrames = 4;
      let fps = 10;

      if (item.is_animated && item.animation_config) {
        try {
          let config: any = item.animation_config;
          if (typeof config === 'string') {
            const trimmed = config.trim();
            if (trimmed.startsWith('{')) {
              config = JSON.parse(trimmed);
              if (typeof config === 'string' && config.trim().startsWith('{')) {
                config = JSON.parse(config);
              }
            } else {
              config = {};
            }
          }
          if (config && typeof config === 'object') {
            // Check for both camelCase and snake_case properties
            const w = config.frameWidth ?? config.frame_width ?? config.width;
            const h = config.frameHeight ?? config.frame_height ?? config.height;
            if (w != null) frameWidth = Number(w);
            if (h != null) frameHeight = Number(h);
            if (w != null || h != null) isAnimated = true;
            
            const total = config.totalFrames ?? config.frame_count ?? config.total_frames ?? config.frames;
            if (total != null) totalFrames = Math.max(1, Number(total) || 4);
            
            const fpsVal = config.fps ?? (config.duration_ms != null && total != null && Number(total) > 1
              ? (Number(total) * 1000) / Number(config.duration_ms)
              : null);
            if (fpsVal != null) fps = Math.max(1, Number(fpsVal) || 10);
          }
        } catch (e) { console.warn('Animation config parse error:', e); }
      }

      // MATHEMATICALLY PERFECT PORT OF YOUR RN SYSTEM:
      // 1. Calculate the percentage position of the anchor center
      const leftPercent = (ADMIN_ANCHOR_POINT + offsetX) / ADMIN_CONTAINER_SIZE;
      const topPercent = (ADMIN_ANCHOR_POINT + offsetY) / ADMIN_CONTAINER_SIZE;

      // 2. Map percentage to the actual pixel center in our Skia container
      const centerX = leftPercent * size;
      const centerY = topPercent * size;

      // 3. Final layer size based on scale
      // CRITICAL FIX: We calculate dimensions based on the 512px reference frame.
      // This ensures 284px items (Flame Sword) are scaled correctly relative to the body.
      const layerWidth = (frameWidth / 512) * size * scale;
      const layerHeight = (frameHeight / 512) * size * scale;

      // 4. Skia draws from top-left, so subtract half width/height from the center
      const lx = centerX - (layerWidth / 2);
      const ly = centerY - (layerHeight / 2);

      const isBackgroundSlot = slot === 'background';
      const calculatedZIndex = isBackgroundSlot 
        ? -10 
        : (isHandGrip && handGripZIndexOverride !== null && handGripZIndexOverride !== undefined)
          ? Number(handGripZIndexOverride)
          : Number(item.z_index || 10);

      // Check active masks
      const activeMask = activeMasks.find(m => m.targets.includes(slot));
      const maskUrl = activeMask?.url;

      const common = {
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
        frameWidth,
        frameHeight,
        maskUrl,
        rotation,
      };

      if (slot === 'hair' && item.image_base_url && hairHex && !isAnimated) {
        layers.push({
          ...common,
          id: `${cosmetic.id}-hair-sil`,
          uri: item.image_base_url,
          zIndex: calculatedZIndex,
          tintColor: hairHex,
          isAnimated: false,
          totalFrames: 1,
          fps: 10,
        });
        layers.push({
          ...common,
          id: cosmetic.id,
          uri: item.image_url,
          zIndex: calculatedZIndex + 0.01,
          tintColor: undefined,
          isAnimated: false,
          totalFrames: 1,
          fps: 10,
        });
      } else {
        layers.push({
          ...common,
          id: cosmetic.id,
          uri: item.image_url,
          zIndex: calculatedZIndex,
          tintColor,
          isAnimated,
          totalFrames,
          fps,
        });
      }
    });

    return layers.sort((a, b) => a.zIndex - b.zIndex);
  }, [user, size, activeVisualGender, scaleRatio, activeSkinColor, useSkiaTint, baseBodyImage, finalEquippedCosmetics, activeMasks]);

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
              maskUrl={layer.maskUrl}
              size={size ?? 48}
              rotation={layer.rotation}
              centerX={layer.centerX}
              centerY={layer.centerY}
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
              maskUrl={layer.maskUrl}
              rotation={layer.rotation}
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
