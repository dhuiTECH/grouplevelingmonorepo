import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { DEFAULT_HAIR_TINT_HEX } from '@repo/avatar-constants';
import { User } from '@/types/user';
import { ShopItemMedia } from '../ShopItemMedia';
import { getEffectiveGender } from './LayeredAvatarUtils';
import SkiaTintedLayer from './layers/SkiaTintedLayer';
import StaticOverlayLayer from './layers/StaticOverlayLayer';
import SkiaBaseLayer from './layers/SkiaBaseLayer';
import MaskedStaticOverlayLayer from './layers/MaskedStaticOverlayLayer';
import { WeaponAttackAnimatedInner } from './WeaponAttackAnimatedInner';
import { resolveWeaponAttackPreset } from '@/utils/resolveWeaponAttackPreset';

interface LayeredAvatarProps {
  user: User;
  size?: number;
  onAvatarClick?: (user: User) => void;
  style?: ViewStyle;
  hideBackground?: boolean;
  square?: boolean;
  allShopItems?: any[];
  isMoving?: boolean;
  /** When set with equipped weapon, animates weapon + hand_grip on battle skill resolve */
  weaponGripAttackKey?: number;
  weaponGripAttackDurationMs?: number;
  /** When true, avatar root does not clip — hand_grip / weapon can extend outside the frame (e.g. battle swings). */
  allowOverflow?: boolean;
}

const LayeredAvatarInternal: React.FC<LayeredAvatarProps> = ({ 
  user, 
  size = 64, 
  onAvatarClick,
  style,
  hideBackground = false,
  square = false,
  allShopItems = [],
  isMoving = false,
  weaponGripAttackKey,
  weaponGripAttackDurationMs,
  allowOverflow = false,
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
  
  // If we have an active skin item from the shop, use its image
  const baseBodyImage = activeSkinItem?.shop_items?.image_url || user?.base_body_url || user?.avatar_url;
  
  // Skin tint: profile / preview (Avatar screen) must override the shop item default,
  // otherwise changing skin tone in the creator has no effect.
  const profileSkinHex =
    typeof user?.base_body_tint_hex === 'string' && user.base_body_tint_hex.trim().length > 0
      ? user.base_body_tint_hex.trim()
      : null;
  const activeSkinColor =
    profileSkinHex ||
    activeSkinItem?.shop_items?.skin_tint_hex ||
    '#FFDBAC';

  // Determine if the base body itself should be tinted
  // ONLY base_body items use the tinted silhouette system, unique avatars are static images
  const isBaseBody = getSlot(activeSkinItem?.shop_items) === 'base_body';
  const useSkiaTint = !!(isBaseBody && activeSkinColor);

  // Fallback image source for static rendering
  const baseSource = typeof baseBodyImage === 'string' && baseBodyImage.startsWith('http')
      ? { uri: baseBodyImage }
      : (baseBodyImage || require('../../../assets/NoobMan.png'));

  // 3. Hand Grip Logic
  // Find equipped weapon to determine grip
  const equippedWeapon = equippedCosmetics.find((c: any) => getSlot(c.shop_items) === 'weapon');
  const handGripZIndexOverride = equippedWeapon?.shop_items?.hand_grip_z_index_override;

  const attackPresetResolved = resolveWeaponAttackPreset(equippedWeapon?.shop_items);
  const weaponAttackLayer =
    weaponGripAttackKey != null && attackPresetResolved != null
      ? {
          attackKey: weaponGripAttackKey,
          preset: attackPresetResolved,
          durationMs: weaponGripAttackDurationMs ?? 500,
        }
      : null;

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
    const isFemale = activeVisualGender === 'female';
    
    // Check if item has explicit female offsets
    const hasFemaleOffset = isFemale && (
      (item.offset_x_female !== null && item.offset_x_female !== undefined) ||
      (item.offset_y_female !== null && item.offset_y_female !== undefined)
    );

    const offsetX = (isFemale && item.offset_x_female !== null && item.offset_x_female !== undefined) 
      ? item.offset_x_female 
      : (item.offset_x || 0);

    const offsetY = (isFemale && item.offset_y_female !== null && item.offset_y_female !== undefined) 
      ? item.offset_y_female 
      : (item.offset_y || 0);
      
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
      style={[
        styles.container,
        {
          width: size,
          height: size,
          // Rounded corners + overflow visible still clips on some platforms; battle uses allowOverflow for swings.
          borderRadius: allowOverflow ? 0 : square ? 16 : size / 2,
          overflow: allowOverflow ? 'visible' : 'hidden',
        },
        style,
      ]}
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
            overflow: allowOverflow ? 'visible' : undefined,
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
              maskUrl={activeMasks.find(m => m.targets.includes('base_body'))?.url}
            />
          </View>
        ) : (
          /* Single base layer when not using Skia tint (e.g. Unique Avatars or fallback) */
          <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
            {activeMasks.find(m => m.targets.includes('avatar') || m.targets.includes('base_body')) && baseBodyImage ? (
              <SkiaBaseLayer
                uri={baseBodyImage}
                tintColor={useSkiaTint ? activeSkinColor : undefined}
                size={size}
                maskUrl={activeMasks.find(m => m.targets.includes('avatar') || m.targets.includes('base_body'))!.url}
              />
            ) : (
              <Image
                source={baseSource}
                style={styles.fullSize}
                contentFit="contain"
                placeholder={require('../../../assets/NoobMan.png')}
                cachePolicy="memory-disk"
              />
            )}
          </View>
        )}

        {/* Overlay Layers (eyes, mouth, hair, face, body, hands) — all above base body outline */}
        {overlayLayers.map((cosmetic: any) => {
            const item = cosmetic.shop_items;
            if (!item) return null; // Safety check

            const slot = getSlot(item);
            const hairTintEffective =
              slot === 'hair'
                ? (user?.hair_tint_hex?.trim() || item.skin_tint_hex || DEFAULT_HAIR_TINT_HEX)
                : null;
            const itemForRender =
              slot === 'hair'
                ? { ...item, skin_tint_hex: hairTintEffective }
                : item;
            
            const { offsetX, offsetY, scale: dbScale, rotation } = getItemPositioning(item);

            const leftPercent = ((ADMIN_ANCHOR_POINT + offsetX) / ADMIN_CONTAINER_SIZE) * 100;
            const topPercent = ((ADMIN_ANCHOR_POINT + offsetY) / ADMIN_CONTAINER_SIZE) * 100;

            const isHandGrip = slot === 'hand_grip';
            const isWeaponOrGrip = slot === 'weapon' || isHandGrip;
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

            // Check for active mask
            const activeMask = activeMasks.find(m => m.targets.includes(slot));
            const maskUrl = activeMask?.url;

            if (maskUrl) {
              return (
                <MaskedStaticOverlayLayer
                  key={cosmetic.id}
                  item={itemForRender}
                  maskUrl={maskUrl}
                  leftPercent={leftPercent}
                  topPercent={topPercent}
                  zIndex={zIndex}
                  dbScale={dbScale}
                  scaleRatio={scaleRatio}
                  rotation={rotation}
                  size={size}
                  tintColor={isHandGrip ? activeSkinColor : null}
                  hairFillHex={slot === 'hair' ? hairTintEffective : null}
                  weaponAttack={isWeaponOrGrip ? weaponAttackLayer : null}
                />
              );
            }

            // Web LayeredAvatar always uses mask+fill hair stack; spritesheet path skips ShopItemMedia tint.
            const useHairTintStack = slot === 'hair' && !!item.image_url;

            if (isAnimated && !useHairTintStack) {
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
                    overflow: 'visible',
                    transform: [
                      { translateX: -finalWidth / 2 },
                      { translateY: -finalHeight / 2 },
                      { rotate: `${rotation}deg` }
                    ],
                  }}
                  pointerEvents="none"
                  collapsable={false}
                >
                  <WeaponAttackAnimatedInner
                    attackKey={isWeaponOrGrip ? weaponAttackLayer?.attackKey : undefined}
                    attackPreset={isWeaponOrGrip ? weaponAttackLayer?.preset ?? null : null}
                    durationMs={weaponAttackLayer?.durationMs ?? 500}
                  >
                    <ShopItemMedia 
                      item={itemForRender} 
                      animate={true} 
                      forceFullImage={true}
                      style={styles.fullSize}
                      resizeMode="contain"
                    />
                  </WeaponAttackAnimatedInner>
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
                    weaponAttack={isWeaponOrGrip ? weaponAttackLayer : null}
                  />
                );
              }

              // Standard static layer for hair, eyes, etc. (use itemForRender so hair picks up user hair_tint_hex)
              return (
                <StaticOverlayLayer
                  key={cosmetic.id}
                  cosmetic={cosmetic}
                  item={itemForRender}
                  leftPercent={leftPercent}
                  topPercent={topPercent}
                  zIndex={zIndex}
                  dbScale={dbScale}
                  scaleRatio={scaleRatio}
                  rotation={rotation}
                  tintColor={tintColor}
                  silhouetteUrl={silhouetteUrl}
                  weaponAttack={isWeaponOrGrip ? weaponAttackLayer : null}
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
  if (prev.user?.hair_tint_hex !== next.user?.hair_tint_hex) return false;
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

  if (prev.weaponGripAttackKey !== next.weaponGripAttackKey) return false;
  if (prev.weaponGripAttackDurationMs !== next.weaponGripAttackDurationMs) return false;
  if (prev.allowOverflow !== next.allowOverflow) return false;

  return true;
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    position: 'relative',
  },
  fullSize: {
    width: '100%',
    height: '100%',
  }
});

export default LayeredAvatar;
