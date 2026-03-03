import React, { useState, useEffect, useRef } from 'react';
import { View, Image as RNImage, StyleSheet, TouchableOpacity, ViewStyle, Animated, Easing, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { User } from '@/types/user';
import { ShopItemMedia } from './ShopItemMedia';
import { Canvas, Image as SkiaImage, useImage, ColorMatrix } from '@shopify/react-native-skia';

const FALLBACK_STATIC_SIZE = 512;

/** Increases saturation by percent for darker skin tones to prevent ashy look on OLED. */
function increaseSaturationForDarkSkin(hex: string, percentIncrease: number = 10): string {
  const clean = hex.replace(/^#/, '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  if (l >= 0.5) return hex;
  const newS = Math.min(1, s * (1 + percentIncrease / 100));
  const c = (1 - Math.abs(2 * l - 1)) * newS;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r2 = 0, g2 = 0, b2 = 0;
  if (h < 1/6) { r2 = c; g2 = x; b2 = 0; }
  else if (h < 2/6) { r2 = x; g2 = c; b2 = 0; }
  else if (h < 3/6) { r2 = 0; g2 = c; b2 = x; }
  else if (h < 4/6) { r2 = 0; g2 = x; b2 = c; }
  else if (h < 5/6) { r2 = x; g2 = 0; b2 = c; }
  else { r2 = c; g2 = 0; b2 = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}

/** Helper to convert hex to RGB array [R, G, B] normalized 0-1 */
const hexToRgb = (hex: string) => {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
};

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
}> = ({ item, leftPercent, topPercent, zIndex, dbScale, scaleRatio, rotation, tintColor }) => {
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
        transform: [
          { translateX: -finalSize / 2 },
          { translateY: -finalSize / 2 },
          { rotate: `${rotation}deg` }
        ],
      }}
      pointerEvents="none"
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
        // Fallback while loading
        <ShopItemMedia
          item={item}
          animate={false}
          forceFullImage={true}
          style={{ width: finalSize, height: finalSize, opacity: 0 }} // Hidden until loaded
          resizeMode="contain"
        />
      )}
    </View>
  );
};

/** Static overlay layer that sizes by image intrinsic dimensions (matches Next.js: natural size × scale × scaleRatio). */
const StaticOverlayLayer: React.FC<{
  cosmetic: any;
  item: any;
  leftPercent: number;
  topPercent: number;
  zIndex: number;
  dbScale: number;
  scaleRatio: number;
  rotation: number;
  tintColor?: string | null;
  silhouetteUrl?: string | null;
}> = ({ cosmetic, item, leftPercent, topPercent, zIndex, dbScale, scaleRatio, rotation, tintColor, silhouetteUrl }) => {
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

  const baseSize = intrinsicSize ?? FALLBACK_STATIC_SIZE;
  const finalSize = baseSize * dbScale * scaleRatio;

  return (
    <View
      style={{
        position: 'absolute',
        zIndex: zIndex,
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: finalSize,
        height: finalSize,
        transform: [
          { translateX: -finalSize / 2 },
          { translateY: -finalSize / 2 },
          { rotate: `${rotation}deg` }
        ],
      }}
      pointerEvents="none"
    >
      {tintColor && silhouetteUrl && (
        <>
          <Image
            source={{ uri: silhouetteUrl }}
            style={[StyleSheet.absoluteFill, { tintColor: increaseSaturationForDarkSkin(tintColor) }]}
            contentFit="contain"
            cachePolicy="none"
          />
          <Image
            source={{ uri: silhouetteUrl }}
            style={[StyleSheet.absoluteFill, { tintColor: '#000000', opacity: 0.20 }]}
            contentFit="contain"
            cachePolicy="none"
          />
        </>
      )}
      <ShopItemMedia
        item={item}
        animate={false}
        forceFullImage={true}
        style={{ width: finalSize, height: finalSize }}
        resizeMode="contain"
      />
    </View>
  );
};

/** Skia layer for base bodies that fills the parent size (no offset math required) */
const SkiaBaseLayer: React.FC<{
  uri: string;
  tintColor: string;
  size: number;
}> = ({ uri, tintColor, size }) => {
  const skiaImg = useImage(uri);
  const [r, g, b] = hexToRgb(tintColor);
  
  const multiplyMatrix = [
    r, 0, 0, 0, 0,
    0, g, 0, 0, 0,
    0, 0, b, 0, 0,
    0, 0, 0, 1, 0,
  ];

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

  return (
    <Canvas 
      style={{ width: size, height: size }}
      pointerEvents="none"
    >
      <SkiaImage
        image={skiaImg}
        fit="contain"
        x={0}
        y={0}
        width={size}
        height={size}
      >
        <ColorMatrix matrix={multiplyMatrix} />
      </SkiaImage>
    </Canvas>
  );
};

interface LayeredAvatarProps {
  user: User;
  size?: number;
  onAvatarClick?: (user: User) => void;
  style?: ViewStyle;
  hideBackground?: boolean;
  square?: boolean;
  allShopItems?: any[];
  isMoving?: boolean;
}

const LayeredAvatarInternal: React.FC<LayeredAvatarProps> = ({ 
  user, 
  size = 64, 
  onAvatarClick,
  style,
  hideBackground = false,
  square = false,
  allShopItems = [],
  isMoving = false
}) => {
  // Create the breathing value
  const breatheAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMoving) {
      breatheAnim.setValue(0);
      return;
    }
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 1250,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [breatheAnim, isMoving]);

  // Interpolate for scale and translation
  const translateY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0], // Removed lift to prevent levitation/cut-off
  });
  const scaleY = breatheAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02], // Increased stretch for better visibility
  });

  const equippedCosmetics = user?.cosmetics?.filter((c: any) => c.equipped) || [];

  // Helper to normalize slot names
  const getSlot = (item: any) => item?.slot?.trim().toLowerCase();
  
  // Define what counts as a "body replacement" slot
  const isAvatarSlot = (slot: string | undefined) => {
    return slot === 'avatar' || slot === 'fullbody' || slot === 'skin' || slot === 'character' || slot === 'base_body';
  };

  // Find equipped background first
  const equippedBackground = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'background');

  // 2. Base Body Priority Logic
  // Check if we have an equipped avatar (unique character)
  const equippedAvatarItem = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'avatar');
  // Check if we have an equipped base_body (standard custom body)
  const equippedBaseBodyItem = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'base_body');
  
  // The active "skin" item that provides the base look
  const activeSkinItem = equippedAvatarItem || equippedBaseBodyItem;
  
  // If we have an active skin item from the shop, use its image
  const baseBodyImage = activeSkinItem?.shop_items?.image_url || user?.base_body_url || user?.avatar_url;
  
  // Determine the skin color to use for hands/accessories:
  // 1. If it's a unique avatar, it might have its own hardcoded skin_tint_hex
  // 2. Otherwise, use the user's custom base_body_tint_hex chosen in AvatarLab
  // 3. Fallback to default
  const activeSkinColor = activeSkinItem?.shop_items?.skin_tint_hex || user?.base_body_tint_hex || "#FFDBAC";

  // Determine if the base body itself should be tinted
  // ONLY base_body items use the tinted silhouette system, unique avatars are static images
  const isBaseBody = getSlot(activeSkinItem?.shop_items) === 'base_body';
  const useSkiaTint = !!(isBaseBody && activeSkinColor);

  // Fallback image source for static rendering
  const baseSource = typeof baseBodyImage === 'string' && baseBodyImage.startsWith('http')
      ? { uri: baseBodyImage }
      : (baseBodyImage || require('../../assets/NoobMan.png'));

  // 3. Hand Grip Logic
  // Find equipped weapon to determine grip
  const equippedWeapon = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'weapon');
  const handGripZIndexOverride = equippedWeapon?.shop_items?.hand_grip_z_index_override;
  
  let handGripCosmetic = null;
  if (equippedWeapon?.shop_items?.grip_type) {
      const gripType = equippedWeapon.shop_items.grip_type;
      
      // Get the gender of the ACTIVE skin item (either unique avatar or base body)
      // If it doesn't have one explicitly set, fallback to user profile gender
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
        
        // Handle database format where gender is a JSON string array '["Male"]'
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
               itemGenders.some(g => activeSkinGenders.includes(g));
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
                  equipped: true, // Mark as virtually equipped so it renders
                  shop_items: matchingShopItem
              };
          }
      }
  }

  // 4. Filter overlays (exclude equipped skin, background, and handle hand_grip separately if auto-detected)
  const baseOverlayLayers = equippedCosmetics
    .filter((c: any) => {
      const slot = getSlot(c.shop_items);
      // Ensure we don't accidentally filter out items that don't have an image_url if they are hand grips.
      // Actually we explicitly handle hand_grips outside of baseOverlayLayers, so we just filter them out here.
      return c.shop_items && c.shop_items.image_url && !isAvatarSlot(slot) && slot !== 'background' && slot !== 'hand_grip';
    });

  const finalOverlayLayers = [...baseOverlayLayers];
  
  // Also include explicitly equipped hand grips if we didn't auto-detect one above
  if (handGripCosmetic) {
      // Force it to be considered equipped and having an image_url for the renderer below
      finalOverlayLayers.push({
        ...handGripCosmetic,
        equipped: true,
      });
  } else {
      // Fallback: If no auto-detected hand grip, but the user explicitly has one equipped
      const explicitlyEquippedHandGrip = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'hand_grip');
      if (explicitlyEquippedHandGrip) {
          finalOverlayLayers.push(explicitlyEquippedHandGrip);
      }
  }

  // Double fallback: if absolutely no hand grip is in finalOverlayLayers, but they have a hand_grip equipped in cosmetics
  // (this catches cases where grip_type didn't match or gender didn't match, but we still want to show *something*)
  const hasHandGripInLayers = finalOverlayLayers.some(c => c.shop_items && getSlot(c.shop_items) === 'hand_grip');
  if (!hasHandGripInLayers) {
      const fallbackEquippedHandGrip = equippedCosmetics.find((c: any) => c.shop_items && getSlot(c.shop_items) === 'hand_grip');
      if (fallbackEquippedHandGrip) {
          finalOverlayLayers.push(fallbackEquippedHandGrip);
      }
  }

  // Final safety check: ensuring the baseOverlayLayers don't accidentally drop items that lack an image_url but shouldn't be dropped if they are hand grips. Wait, we already added hand grips to finalOverlayLayers explicitly.
  
  const overlayLayers = finalOverlayLayers.sort((a: any, b: any) => Number(a.shop_items?.z_index || 1) - Number(b.shop_items?.z_index || 1));

  const ADMIN_CONTAINER_SIZE = 512;
  const ADMIN_ANCHOR_POINT = 128;
  const scaleRatio = size / ADMIN_CONTAINER_SIZE;

  const getItemPositioning = (item: any) => {
    const isFemale = user?.gender === 'female';
    
    // Check if item has explicit female offsets
    const hasFemaleOffset = isFemale && (
      (item.offset_x_female !== null && item.offset_x_female !== undefined) ||
      (item.offset_y_female !== null && item.offset_y_female !== undefined)
    );

    const offsetX = (isFemale && item.offset_x_female !== null && item.offset_x_female !== undefined) 
      ? item.offset_x_female 
      : (item.offset_x || 0);
      
    // Apply a global Y-offset tweak to fix the floating hand issue if it's a hand grip
    // Hand grips seem to float ~10-15px too high on mobile compared to web
    const GLOBAL_HAND_Y_TWEAK = getSlot(item) === 'hand_grip' ? 10 : 0;

    const offsetY = ((isFemale && item.offset_y_female !== null && item.offset_y_female !== undefined) 
      ? item.offset_y_female 
      : (item.offset_y || 0)) + GLOBAL_HAND_Y_TWEAK;
      
    const scale = (isFemale && item.scale_female !== null && item.scale_female !== undefined) 
      ? item.scale_female 
      : parseFloat(item.scale || "1");
      
    const rotation = (isFemale && item.rotation_female !== null && item.rotation_female !== undefined) 
      ? item.rotation_female 
      : (item.rotation || 0);

    return { offsetX, offsetY, scale, rotation };
  };

  const Container = onAvatarClick ? TouchableOpacity : View;

  return (
    <Container 
      style={[styles.container, { width: size, height: size, borderRadius: square ? 16 : size / 2 }, style]}
      onPress={() => onAvatarClick?.(user)}
      activeOpacity={0.9}
    >
      {/* STATIC BACKGROUND (Outside breathing) */}
      {!hideBackground && equippedBackground && (
        <View key={equippedBackground.id} style={StyleSheet.absoluteFill}>
          <ShopItemMedia 
            item={equippedBackground.shop_items} 
            style={styles.fullSize} 
            animate={true} 
            resizeMode="cover"
          />
        </View>
      )}

      {/* BREATHING CONTAINER (Everything else inside here) */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { 
            transform: [{ translateY }, { scaleY }],
            // @ts-ignore - transformOrigin is available in newer RN versions or Expo
            transformOrigin: 'bottom' 
          }
        ]}
        pointerEvents="none"
      >
        {/* Base Body: Skia multiply for base bodies to match hand_grip system */}
        {useSkiaTint && baseBodyImage ? (
          <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
            <SkiaBaseLayer 
              uri={baseBodyImage} 
              tintColor={activeSkinColor} 
              size={size} 
            />
          </View>
        ) : (
          /* Single base layer when not using Skia tint (e.g. Unique Avatars or fallback) */
          <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
            <Image
              source={baseSource}
              style={styles.fullSize}
              contentFit="contain"
              placeholder={require('../../assets/NoobMan.png')}
              cachePolicy="memory-disk"
            />
          </View>
        )}

        {/* Overlay Layers (eyes, mouth, hair, face, body, hands) — all above base body outline */}
        {overlayLayers.map((cosmetic: any) => {
            const item = cosmetic.shop_items;
            if (!item) return null; // Safety check
            
            const { offsetX, offsetY, scale: dbScale, rotation } = getItemPositioning(item);

            const leftPercent = ((ADMIN_ANCHOR_POINT + offsetX) / ADMIN_CONTAINER_SIZE) * 100;
            const topPercent = ((ADMIN_ANCHOR_POINT + offsetY) / ADMIN_CONTAINER_SIZE) * 100;

            const isHandGrip = getSlot(item) === 'hand_grip';
            const zIndex = (isHandGrip && handGripZIndexOverride !== null && handGripZIndexOverride !== undefined) 
              ? Number(handGripZIndexOverride) 
              : Number(item.z_index || 10);
            
            // Fix for "Non-whitespace character found after end of conversion" error
            let isAnimated = false;
            let frameWidth = 96;
            let frameHeight = 96;
            
            if (item.is_animated && item.animation_config) {
              try {
                let config = item.animation_config;
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
                    if (config.frameWidth) frameWidth = Number(config.frameWidth);
                    if (config.frameHeight) frameHeight = Number(config.frameHeight);
                    isAnimated = true;
                }
              } catch (e) {
                console.warn('Animation config parse error:', e);
              }
            }

            // Skin tinting logic - ONLY for hand_grip items to match the user's base body tint
            // Note: Hand grips ALWAYS use the active body's skin color, whether that body is a 
            // base_body or a unique avatar (which provides its own skin_tint_hex)
            const tintColor = isHandGrip ? activeSkinColor : null;
            // For standard tinting we used silhouetteUrl, but for Skia multiplying we just use the main image_url inside SkiaTintedLayer
            // Safely get image_base_url or image_url as a fallback
            const silhouetteUrl = isHandGrip ? (item.image_base_url || item.image_url) : null;
            
            if (isAnimated) {
              const finalWidth = frameWidth * dbScale * scaleRatio;
              const finalHeight = frameHeight * dbScale * scaleRatio;
              
              return (
                <View
                  key={cosmetic.id}
                  style={{
                    position: 'absolute',
                    zIndex: zIndex,
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: finalWidth,
                    height: finalHeight,
                    transform: [
                      { translateX: -finalWidth / 2 },
                      { translateY: -finalHeight / 2 },
                      { rotate: `${rotation}deg` }
                    ],
                  }}
                  pointerEvents="none"
                >
                  <ShopItemMedia 
                    item={item} 
                    animate={true} 
                    forceFullImage={true}
                    style={styles.fullSize}
                    resizeMode="contain"
                  />
                </View>
              );
            } else {
              if (isHandGrip && tintColor) {
                // Determine if we should use SkiaTintedLayer or StaticOverlayLayer.
                // SkiaTintedLayer multiply mode works best when the image has a white background or is specifically designed for multiply blending.
                // If it's a standard PNG, it might just need StaticOverlayLayer.
                // For now, keep SkiaTintedLayer for hand grips as requested previously, but ensure it receives the correct item.
                return (
                  <SkiaTintedLayer
                    key={cosmetic.id}
                    item={item}
                    leftPercent={leftPercent}
                    topPercent={topPercent}
                    zIndex={zIndex}
                    dbScale={dbScale}
                    scaleRatio={scaleRatio}
                    rotation={rotation}
                    tintColor={tintColor}
                  />
                );
              }

              // Standard static layer for hair, eyes, etc.
              return (
                <StaticOverlayLayer
                  key={cosmetic.id}
                  cosmetic={cosmetic}
                  item={item}
                  leftPercent={leftPercent}
                  topPercent={topPercent}
                  zIndex={zIndex}
                  dbScale={dbScale}
                  scaleRatio={scaleRatio}
                  rotation={rotation}
                  tintColor={tintColor}
                  silhouetteUrl={silhouetteUrl}
                />
              );
            }
        })}
      </Animated.View>
    </Container>
  );
};

export const LayeredAvatar = React.memo(LayeredAvatarInternal, (prev, next) => {
  // Return true if props are equal (to SKIP render)
  if (prev.size !== next.size) return false;
  if (prev.isMoving !== next.isMoving) return false;
  if (prev.hideBackground !== next.hideBackground) return false;
  if (prev.square !== next.square) return false;
  
  // Check relevant User properties
  if (prev.user?.avatar_url !== next.user?.avatar_url) return false;
  if (prev.user?.base_body_url !== next.user?.base_body_url) return false;
  if (prev.user?.base_body_tint_hex !== next.user?.base_body_tint_hex) return false;
  if (prev.user?.gender !== next.user?.gender) return false;
  
  // Check if shop items loaded
  if (prev.allShopItems !== next.allShopItems) return false;
  
  // Check cosmetics array reference
  // Note: We assume that if the user changes cosmetics, the array reference changes.
  // But during movement, we update user position which creates a new user object but 
  // SHOULD preserve the cosmetics array reference if handled correctly in useExploration.
  // If useExploration creates a new array, this will fail (return false) and re-render.
  if (prev.user?.cosmetics !== next.user?.cosmetics) {
    // Optional: Deep compare logic if references are unstable but content is same
    // For now, strict reference check is safer, but if it causes re-renders, we might need:
    // return JSON.stringify(prev.user?.cosmetics) === JSON.stringify(next.user?.cosmetics);
    return false; 
  }

  return true;
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden', // RESTORED CLIPPING
    backgroundColor: 'transparent',
    position: 'relative',
  },
  fullSize: {
    width: '100%',
    height: '100%',
  }
});

export default LayeredAvatar;
