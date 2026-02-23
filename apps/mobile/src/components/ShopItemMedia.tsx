import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import AnimatedEquip from './AnimatedEquip';

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

  // --- STATIC RENDER ---
  // If animate is true, we always prefer the full imageSrc over the thumbnail
  // If forceFullImage is true, we also use the full imageSrc
  const finalImageSrc = (animate || forceFullImage) ? imageSrc : (item.thumbnail_url || imageSrc);

  return (
    <Image
      source={finalImageSrc ? { uri: finalImageSrc } : require('../../assets/NoobMan.png')}
      style={style}
      contentFit={resizeMode === 'stretch' ? 'fill' : resizeMode}
      transition={200}
      cachePolicy="memory-disk"
    />
  );
};
