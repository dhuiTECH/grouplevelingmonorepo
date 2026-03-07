"use client";

import AnimatedEquip from './AnimatedEquip';
import Image from 'next/image';

export const ShopItemMedia = ({ 
  item, 
  className, 
  animate = false 
}: { 
  item: any; 
  className?: string; 
  animate?: boolean; 
}) => {
  // 1. Safe parsing of animation_config
  let config = item.animation_config;
  
  // Robust parsing to handle potential double-stringification
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
      // If it's still a string after first parse, parse again
      if (typeof config === 'string') {
        config = JSON.parse(config);
      }
    } catch (e) {
      console.error('Error parsing animation_config for item:', item.name, e);
      config = null;
    }
  }

  // Ensure config has required properties
  const isValidConfig = config && 
    (typeof config.frameWidth === 'number' || typeof config.frameWidth === 'string') &&
    (typeof config.frameHeight === 'number' || typeof config.frameHeight === 'string');

  const isAnimated = item.is_animated && isValidConfig;
  const imageSrc = item.image_url;
  
  // Check if we should be responsive based on className
  const isResponsive = className?.includes('w-full') || className?.includes('h-full');

  // 2. Render Animation Loop
  if (isAnimated && animate) {
    const frameWidth = Number(config.frameWidth);
    const frameHeight = Number(config.frameHeight);
    const totalFrames = Number(config.totalFrames || 1);
    const fps = Number(config.fps || 10);

    return (
      <div 
        className={className}
        style={{ 
          width: isResponsive ? '100%' : frameWidth, 
          height: isResponsive ? '100%' : frameHeight,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <AnimatedEquip
          src={imageSrc}
          frameWidth={frameWidth}
          frameHeight={frameHeight}
          totalFrames={totalFrames}
          fps={fps}
          className="w-full h-full"
        />
      </div>
    );
  }

  // 3. Static Thumbnail Logic (Smart Fallback)
  // If animated but NOT currently animating (e.g. inventory/thumbnail), OR if explicit thumbnail exists
  if (item.thumbnail_url) {
    return (
      <div className={`relative ${className || 'w-full h-full'}`}>
        <Image
          src={item.thumbnail_url}
          alt={item.name || ''}
          fill
          style={{ objectFit: 'contain' }}
          unoptimized
          onError={(e: any) => { e.currentTarget.src = '/NoobMan.png'; }}
        />
      </div>
    );
  }

  // Fallback: Render first frame of spritesheet if animated but no thumbnail
  if (isAnimated) {
    const totalFrames = Number(config.totalFrames || 1);
    return (
      <div
        className={className}
        style={{
          width: isResponsive ? '100%' : undefined,
          height: isResponsive ? '100%' : undefined,
          backgroundImage: `url(${imageSrc})`,
          backgroundPosition: '0% 0%',
          backgroundSize: `${totalFrames * 100}% 100%`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
    );
  }

  // 4. Base Body / Avatar / Skin Tint Logic
  // Only apply tint rendering if it's a base_body, hand_grip, OR if the item explicitly has a base layer (2-layer item)
  // This prevents standard items (like eyes/hair without base layers) from being rendered as a tinted silhouette
  const isTintableSlot = ['base_body', 'hand_grip', 'face_eyes', 'face_mouth', 'hair'].includes(item.slot);
  const shouldRenderTinted = item.slot === 'base_body' || item.slot === 'hand_grip' || (isTintableSlot && item.image_base_url);

  if (shouldRenderTinted) {
    const silhouetteUrl = item.image_base_url || item.thumbnail_url || item.image_url;
    const skinTint = item.skin_tint_hex || '#FFDBAC';
    
    return (
      <div className={`${className} relative overflow-hidden bg-gray-800/50 flex items-center justify-center`}>
        {/* Silhouette Layer */}
        {silhouetteUrl && (
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              backgroundColor: skinTint,
              WebkitMaskImage: `url(${silhouetteUrl})`,
              maskImage: `url(${silhouetteUrl})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat'
            }}
          />
        )}
        {/* Detail/Outline Layer */}
        {imageSrc && imageSrc !== silhouetteUrl && (
          <Image
            src={imageSrc}
            alt={item.name}
            className="absolute inset-0 z-10"
            fill
            unoptimized
            style={{ 
              objectFit: 'contain',
              mixBlendMode: (item.slot === 'hand_grip' || item.slot === 'base_body') ? 'multiply' : 'normal' 
            }}
            onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>
    );
  }

  // 5. Standard Non-Animated Items
  return (
    <div className={`relative ${className || 'w-full h-full'}`}>
      <Image
        src={imageSrc}
        alt={item.name || ''}
        fill
        style={{ objectFit: 'contain' }}
        unoptimized
        onError={(e: any) => { e.currentTarget.src = '/NoobMan.png'; }}
      />
    </div>
  );
};
