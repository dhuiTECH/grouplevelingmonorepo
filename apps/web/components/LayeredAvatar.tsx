"use client";

import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { ShopItemMedia } from './ShopItemMedia';

export default function LayeredAvatar({
  user,
  size = 64,
  onAvatarClick,
  className = "",
  hideBackground = false,
  breathing = true,
}: {
  user: User;
  size?: number;
  onAvatarClick?: (avatar: string, name: string) => void;
  className?: string;
  hideBackground?: boolean;
  /** When true (default), wraps all layers in one breathing container so they move in sync. Set false in admin. */
  breathing?: boolean;
}) {
  const equippedCosmetics = user.cosmetics?.filter((c: any) => c.equipped) || [];
  const [silhouetteBlobUrl, setSilhouetteBlobUrl] = useState<string | null>(null);
  const silhouetteUrl = user.base_body_silhouette_url;

  const getEffectiveGender = (item: any, fallbackGender?: string): 'male' | 'female' => {
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
  };

  useEffect(() => {
    if (!silhouetteUrl || typeof silhouetteUrl !== 'string' || !silhouetteUrl.startsWith('http')) {
      setSilhouetteBlobUrl(null);
      return () => {};
    }
    let cancelled = false;
    fetch(silhouetteUrl, { mode: 'cors' })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        setSilhouetteBlobUrl(url);
      })
      .catch(() => setSilhouetteBlobUrl(null));
    return () => {
      cancelled = true;
      setSilhouetteBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [silhouetteUrl]);

  // Helper to normalize slot names
  const getSlot = (item: any) => item?.slot?.trim().toLowerCase();
  
  // Define what counts as a "body replacement" slot
  const isAvatarSlot = (slot: string | undefined) => {
    return slot === 'avatar' || slot === 'base_body' || slot === 'fullbody' || slot === 'skin' || slot === 'character';
  };

  // 1. Find the equipped skin
  const equippedShopSkinItem = equippedCosmetics.find(c => isAvatarSlot(getSlot(c.shop_items)));
  const equippedShopSkin = equippedShopSkinItem?.shop_items?.image_url;

  // 2. Priority: Equipped Skin > Base Body > User Avatar > Default
  const baseBodyLayer = equippedShopSkin || user.base_body_url || user.avatar_url || '/NoobMan.png';
  const maskUrl = silhouetteBlobUrl || silhouetteUrl || '';
  const useTwoLayerBase = !equippedShopSkin && (silhouetteBlobUrl || user.base_body_silhouette_url) && (user.base_body_url || user.avatar_url);
  
  // Use skin tint from Unique Avatar if equipped and has tint, otherwise use profile tint
  const activeSkinTint = equippedShopSkinItem?.shop_items?.skin_tint_hex || (user as any).base_body_tint_hex || '#FFDBAC';
  const activeVisualGender = getEffectiveGender(equippedShopSkinItem?.shop_items, (user as any).gender);
  
  const baseDetailUrl = user.base_body_url || user.avatar_url || baseBodyLayer;
  
  // Also check if unique avatar has a base_url for 2-layer rendering (even if not base body)
  const avatarTwoLayer = equippedShopSkinItem?.shop_items?.image_base_url;
  const avatarBaseUrl = equippedShopSkinItem?.shop_items?.image_base_url;
  
  const baseTintHex = activeSkinTint;

  // 3. Filter overlays (exclude skin + background — background is rendered static outside breathing)
  const overlayLayers = equippedCosmetics
    .filter((c: any) => {
      const slot = getSlot(c.shop_items);
      return c.shop_items?.image_url && !isAvatarSlot(slot) && slot !== 'background';
    })
    .sort((a: any, b: any) => Number(a.shop_items.z_index || 1) - Number(b.shop_items.z_index || 1));


  // 4. Inject Hand Grip if Weapon has grip_type
  const weaponItem = overlayLayers.find(c => getSlot(c.shop_items) === 'weapon');
  const gripType = weaponItem?.shop_items?.grip_type;
  const handGripZIndexOverride = weaponItem?.shop_items?.hand_grip_z_index_override;
  
  if (gripType) {
    // Look for a hand grip in the cosmetics list (it should be there if equipped logic handles auto-add, 
    // or we might need to find it from the full user inventory if passed differently)
    // Assuming for now the system auto-equips the hand grip item when weapon is equipped, or we can find it in the cosmetic list even if hidden?
    // Actually, typically we just render the hand asset directly if we know the grip type.
    // But since hand grips are shop items with offsets, we need that item data.
    // Let's search for an equipped item with slot 'hand_grip' that matches the weapon's grip type.
    // If the game logic (backend or frontend equip action) adds the hand_grip item to user.cosmetics, then:
    
    // NOTE: This relies on the equip logic adding the hand_grip item to the user's cosmetics list.
    // If that logic isn't present, the hand won't show. 
    // Since we are only modifying rendering here, we assume the data is present in `equippedCosmetics` 
    // OR we need to fetch it from a global store if it's a "system" asset not in user inventory.
    // Given the prompt "weapons trigger specific hand/arm silhouette", usually imply automatic.
    // If the hand grip item is NOT in the user inventory, we can't render it with offsets without fetching the item data.
    // For this implementation, we will assume the Hand Grip Item is PRESENT in the `equippedCosmetics` list (added by game logic).
    // If it's not, we'd need a prop `systemHandGrips` to look up the asset.
    
    // Render logic is handled in the map loop above if the item exists in the list.
  }

  // Extract active masks based on the active rendered body/avatar gender
  const activeMasks: { url: string; targetSlot: string }[] = [];
  overlayLayers.forEach((c: any) => {
    const item = c.shop_items;
    const maskUrl = (activeVisualGender === 'female' && item?.eraser_mask_url_female) ? item.eraser_mask_url_female : item?.eraser_mask_url;
    if (maskUrl && item?.eraser_mask_targets) {
      const targets = Array.isArray(item.eraser_mask_targets) 
        ? item.eraser_mask_targets 
        : [item.eraser_mask_targets];
        
      targets.forEach((target: string) => {
        if (typeof target === 'string') {
          activeMasks.push({
            url: maskUrl,
            targetSlot: target.trim().toLowerCase()
          });
        }
      });
    }
  });

  const applyMasksToLayer = (layerContent: React.ReactNode, currentSlot: string) => {
    const masksForThisLayer = activeMasks.filter((m: any) => m.targetSlot === currentSlot);
    
    if (masksForThisLayer.length === 0) return layerContent;

    return (
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {masksForThisLayer.reduce((children: React.ReactNode, mask: any) => (
          <div
            key={mask.url}
            className="absolute inset-0 w-full h-full"
            style={{
              WebkitMaskImage: `url(${mask.url})`,
              maskImage: `url(${mask.url})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat'
            }}
          >
            {children}
          </div>
        ), layerContent)}
      </div>
    );
  };

  const ADMIN_CONTAINER_SIZE = 512;
  const ADMIN_ANCHOR_POINT = 128;
  const scaleRatio = size / ADMIN_CONTAINER_SIZE;

  const layersWrapperClass = breathing ? "breathing-container" : "absolute inset-0 w-full h-full";

  return (
    <div
      className={`relative overflow-hidden ${className || 'rounded-full'}`}
      style={{ width: size, height: size }}
      onClick={() => onAvatarClick?.(user.avatar_url || '', user.name || '')}
    >
      {/* Background slot: outside breathing container so it stays static */}
      {!hideBackground && equippedCosmetics
        .filter(c => getSlot(c.shop_items) === 'background')
        .map((cosmetic, index) => (
          <div
            key={cosmetic.id ?? `bg-${index}-${cosmetic.shop_items?.id ?? index}`}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 0 }}
          >
            {/* For the live avatar preview, always use the original upload (image/video), not the thumbnail */}
            <ShopItemMedia
              item={{ ...cosmetic.shop_items, thumbnail_url: undefined }}
              className="w-full h-full object-cover"
              animate={true}
            />
          </div>
        ))}

      {/* Base body + overlays: single wrapper so they breathe in sync (no drift) */}
      <div className={layersWrapperClass}>
        <div className="absolute inset-0 w-full h-full" style={{ zIndex: 5 }}>
          {applyMasksToLayer(
            useTwoLayerBase ? (
              <>
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backgroundColor: baseTintHex,
                    WebkitMaskImage: maskUrl ? `url(${maskUrl})` : undefined,
                    maskImage: maskUrl ? `url(${maskUrl})` : undefined,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat'
                  }}
                  aria-hidden
                />
                <img
                  src={baseDetailUrl}
                  alt="Hunter Body"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/NoobMan.png'; }}
                />
              </>
            ) : (
              (() => {
                const slot = getSlot(equippedShopSkinItem?.shop_items);
                const isBaseBody = slot === 'base_body';
                // Only tint if it's a base_body. Unique avatars (avatar slot) should NOT be skin tinted.
                const tintUrl = isBaseBody ? (avatarBaseUrl || baseBodyLayer) : null;
                
                if (tintUrl) {
                  return (
                    <>
                      <div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          backgroundColor: baseTintHex,
                          WebkitMaskImage: `url(${tintUrl})`,
                          maskImage: `url(${tintUrl})`,
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat'
                        }}
                        aria-hidden
                      />
                      <img
                        src={baseBodyLayer}
                        alt="Hunter Body"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ mixBlendMode: 'multiply' }}
                        onError={(e) => { e.currentTarget.src = '/NoobMan.png'; }}
                      />
                    </>
                  );
                }
                
                return (
                  <img
                    src={baseBodyLayer}
                    alt="Hunter Body"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/NoobMan.png'; }}
                  />
                );
              })()
            ),
            getSlot(equippedShopSkinItem?.shop_items) || 'base_body'
          )}
        </div>

        {overlayLayers.map((cosmetic, index) => {
          const item = cosmetic.shop_items;
          const hairTint = (user as { hair_tint_hex?: string | null }).hair_tint_hex?.trim();
          const itemForMedia =
            getSlot(item) === 'hair' && hairTint
              ? { ...item, skin_tint_hex: hairTint }
              : item;
          const isFemale = activeVisualGender === 'female';
          
          // Use female-specific positioning if available and character is female
          const itemOffsetX = (isFemale && item.offset_x_female !== null && item.offset_x_female !== undefined) ? item.offset_x_female : (item.offset_x || 0);
          const itemOffsetY = (isFemale && item.offset_y_female !== null && item.offset_y_female !== undefined) ? item.offset_y_female : (item.offset_y || 0);
          const itemScale = (isFemale && item.scale_female !== null && item.scale_female !== undefined) ? item.scale_female : parseFloat(item.scale || "1");
          const itemRotation = (isFemale && item.rotation_female !== null && item.rotation_female !== undefined) ? item.rotation_female : (item.rotation || 0);

          const leftPercent = ((ADMIN_ANCHOR_POINT + itemOffsetX) / ADMIN_CONTAINER_SIZE) * 100;
          const topPercent = ((ADMIN_ANCHOR_POINT + itemOffsetY) / ADMIN_CONTAINER_SIZE) * 100;

          const zIndex = Number(item.z_index || 10);

          // Determine if item is animated and get frame dimensions
          let isAnimated = false;
          let frameWidth = 96; // Default for static items
          let frameHeight = 96;
          
          if (item.is_animated && item.animation_config) {
            try {
              let config = item.animation_config;
              if (typeof config === 'string') {
                config = JSON.parse(config);
                if (typeof config === 'string') {
                  config = JSON.parse(config);
                }
              }
              if (config?.frameWidth && config?.frameHeight) {
                isAnimated = true;
                frameWidth = Number(config.frameWidth);
                frameHeight = Number(config.frameHeight);
              }
            } catch (e) {
              // Use defaults if parsing fails
            }
          }

          // For animated items: use frame dimensions (content is centered in frame)
          // For static items: use a larger container that allows natural image sizing
          // This handles items with offset visual content (like backpack with padding)
          const useFrameDimensions = isAnimated;
          
          // Calculate container dimensions
          let containerWidth: number | string;
          let containerHeight: number | string;
          let transformValue: string;
          let mediaClassName: string;
          
          if (useFrameDimensions) {
            // Animated items: use exact frame dimensions
            containerWidth = frameWidth * itemScale * scaleRatio;
            containerHeight = frameHeight * itemScale * scaleRatio;
            transformValue = `translate(-50%, -50%) rotate(${itemRotation}deg)`;
            mediaClassName = "w-full h-full";
          } else {
            // Static items: use 1px container with scale transform
            // This allows the image to render at natural size, then scale
            // The offset_x/offset_y in admin tool can be used to adjust for visual content offset
            containerWidth = 1;
            containerHeight = 1;
            transformValue = `translate(-50%, -50%) scale(${itemScale * scaleRatio}) rotate(${itemRotation}deg)`;
            mediaClassName = "max-w-none";
          }

          const currentSlot = getSlot(item);
          const isHandGrip = currentSlot === 'hand_grip';
          const finalZIndex = (isHandGrip && handGripZIndexOverride !== null && handGripZIndexOverride !== undefined) 
            ? Number(handGripZIndexOverride) 
            : zIndex;
          
          if (isHandGrip && item.image_url) {
             return applyMasksToLayer(
              <div
                key={cosmetic.id ?? `overlay-${index}-${item?.id ?? index}`}
                className="absolute pointer-events-none flex items-center justify-center"
                style={{
                  zIndex: finalZIndex,
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: transformValue,
                  transformOrigin: 'center',
                  width: typeof containerWidth === 'number' && containerWidth === 1 ? '1px' : `${containerWidth}px`,
                  height: typeof containerHeight === 'number' && containerHeight === 1 ? '1px' : `${containerHeight}px`,
                }}
              >
                 <div className={`relative ${mediaClassName}`}>
                    {/* Tinted Layer */}
                    <div 
                      className="absolute inset-0 w-full h-full"
                      style={{
                        backgroundColor: baseTintHex,
                        WebkitMaskImage: `url(${item.image_url})`,
                        maskImage: `url(${item.image_url})`,
                        WebkitMaskSize: 'contain',
                        maskSize: 'contain',
                        WebkitMaskPosition: 'center',
                        maskPosition: 'center',
                        WebkitMaskRepeat: 'no-repeat',
                        maskRepeat: 'no-repeat'
                      }}
                    />
                    {/* Lines Layer (Multiply) */}
                    <img 
                      src={item.image_url} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ mixBlendMode: 'multiply' }}
                    />
                 </div>
              </div>,
              currentSlot
             );
          }

          // Hair: dedicated inline render — uses a real <img> for intrinsic sizing
          // (the 1px + scale trick doesn't work for mask/tint stacks that have only absolute children)
          if (currentSlot === 'hair' && item.image_url) {
            const hairColor = hairTint || item.skin_tint_hex || '#5D4037';
            const maskSrc = item.image_base_url || item.image_url;
            return applyMasksToLayer(
              <div
                key={cosmetic.id ?? `overlay-${index}-${item?.id ?? index}`}
                className="absolute pointer-events-none flex items-center justify-center"
                style={{
                  zIndex: finalZIndex,
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: transformValue,
                  transformOrigin: 'center',
                  width: '1px',
                  height: '1px',
                }}
              >
                <div className="relative inline-block max-w-none" style={{ isolation: 'isolate', lineHeight: 0 }}>
                  {/* In-flow img establishes intrinsic size for the absolute layers */}
                  <img
                    src={item.image_url}
                    alt=""
                    aria-hidden
                    className="block max-w-none h-auto w-auto pointer-events-none select-none"
                    style={{ opacity: 0 }}
                  />
                  {/* Tinted fill masked by silhouette (or image_url if no base) */}
                  <div
                    className="absolute inset-0 w-full h-full"
                    style={{
                      backgroundColor: hairColor,
                      WebkitMaskImage: `url(${maskSrc})`,
                      maskImage: `url(${maskSrc})`,
                      WebkitMaskSize: 'contain',
                      maskSize: 'contain',
                      WebkitMaskPosition: 'center',
                      maskPosition: 'center',
                      WebkitMaskRepeat: 'no-repeat',
                      maskRepeat: 'no-repeat',
                    }}
                  />
                  {/* Detail / outline layer (multiply for shading) */}
                  <img
                    src={item.image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                </div>
              </div>,
              currentSlot
            );
          }

          return applyMasksToLayer(
            <div
              key={cosmetic.id ?? `overlay-${index}-${item?.id ?? index}`}
              className="absolute pointer-events-none flex items-center justify-center"
              style={{
                zIndex: finalZIndex,
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                transform: transformValue,
                transformOrigin: 'center',
                width:
                  typeof containerWidth === 'number' && containerWidth === 1
                    ? '1px'
                    : `${containerWidth}px`,
                height:
                  typeof containerHeight === 'number' && containerHeight === 1
                    ? '1px'
                    : `${containerHeight}px`,
              }}
            >
              {/* For the live avatar preview, always use the original upload (image/video), not the thumbnail */}
              <ShopItemMedia
                item={{ ...itemForMedia, thumbnail_url: undefined }}
                animate={true}
                className={mediaClassName}
              />
            </div>,
            currentSlot
          );
        })}
      </div>
    </div>
  );
}
