import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import AnimatedEquip from './AnimatedEquip';
import { increaseSaturationForDarkSkin } from './LayeredAvatar/LayeredAvatarUtils';
import { HairTintSkiaStack } from './LayeredAvatar/layers/HairTintSkiaStack';

interface ShopItemMediaProps {
  item: any;
  style?: any; 
  animate?: boolean;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  forceFullImage?: boolean;
}

export const ShopItemMedia = ({ 
  item, 
  style, 
  animate = false,
  resizeMode = 'contain',
  forceFullImage = false
}: ShopItemMediaProps) => {

  // --- CONFIG PARSING ---
  let config = item.animation_config;
  
  if (typeof config === 'string') {
    try {
      config = JSON.parse(config);
      if (typeof config === 'string') {
        config = JSON.parse(config);
      }
    } catch (e) {
      console.error('Error parsing animation_config:', item.name, e);
      config = null;
    }
  }

  const isValidConfig = config && 
    (typeof config.frameWidth === 'number' || typeof config.frameWidth === 'string') &&
    (typeof config.frameHeight === 'number' || typeof config.frameHeight === 'string');

  const isAnimated = item.is_animated && isValidConfig;
  const imageSrc = item.image_url;

  const contentFit =
    resizeMode === 'stretch' ? 'fill' : resizeMode;

  // --- SPRITESHEET RENDER (Animated or Static First Frame) ---
  // If we want to animate, OR if it's a spritesheet and we don't have a specific thumbnail, use AnimatedEquip
  if (isAnimated && (animate || !item.thumbnail_url)) {
    const frameWidth = Number(config.frameWidth);
    const frameHeight = Number(config.frameHeight);
    const totalFrames = Number(config.totalFrames || 1);
    const fps = Number(config.fps || 10);

    return (
      <AnimatedEquip
        src={imageSrc}
        frameWidth={frameWidth}
        frameHeight={frameHeight}
        totalFrames={totalFrames}
        fps={fps}
        style={style}
        paused={!animate}
      />
    );
  }

  // Tint + detail stack (matches web LayeredAvatar hair + web ShopItemMedia)
  const isTintableSlot = ['base_body', 'hand_grip', 'face_eyes', 'face_mouth', 'hair'].includes(item.slot);
  // Web LayeredAvatar hair uses mask = image_base_url || image_url so hair tints without a separate base layer.
  const shouldRenderTinted =
    item.slot === 'base_body' ||
    item.slot === 'hand_grip' ||
    (isTintableSlot && item.image_base_url) ||
    (item.slot === 'hair' && !!item.image_url);

  const silhouetteUrl =
    item.slot === 'hair'
      ? item.image_base_url || item.image_url
      : item.image_base_url || item.thumbnail_url || item.image_url;

  if (shouldRenderTinted && silhouetteUrl) {
    const skinTint = item.skin_tint_hex || '#FFDBAC';

    // Web LayeredAvatar: mask + solid hairColor + multiply line art (not Image tintColor).
    if (item.slot === 'hair' && imageSrc) {
      const hairHex = item.skin_tint_hex || '#5D4037';
      const skiaFit =
        resizeMode === 'stretch' ? 'fill' : resizeMode === 'cover' ? 'cover' : 'contain';
      return (
        <HairTintSkiaStack
          maskUri={silhouetteUrl}
          lineUri={imageSrc}
          fillHex={hairHex}
          style={[style, tintStyles.stack]}
          fit={skiaFit}
        />
      );
    }

    const showLineArtLayer =
      !!imageSrc &&
      (imageSrc !== silhouetteUrl || item.slot === 'hair');
    return (
      <View style={[style, tintStyles.stack]}>
        <Image
          source={{ uri: silhouetteUrl }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit as any}
          tintColor={increaseSaturationForDarkSkin(skinTint)}
          transition={0}
          cachePolicy="memory-disk"
          priority="high"
        />
        {showLineArtLayer && (
          <Image
            source={{ uri: imageSrc }}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit as any}
            transition={0}
            cachePolicy="memory-disk"
            priority="high"
          />
        )}
      </View>
    );
  }

  // --- STATIC RENDER ---
  // If animate is true, we always prefer the full imageSrc over the thumbnail
  // If forceFullImage is true, we also use the full imageSrc
  const finalImageSrc = (animate || forceFullImage) ? imageSrc : (item.thumbnail_url || imageSrc);

  return (
    <Image
      source={finalImageSrc ? { uri: finalImageSrc } : require('../../assets/NoobMan.png')}
      style={style}
      contentFit={contentFit as any}
      transition={0}
      cachePolicy="memory-disk"
      priority="high"
    />
  );
};

const tintStyles = StyleSheet.create({
  stack: {
    position: 'relative',
    overflow: 'hidden',
  },
});
