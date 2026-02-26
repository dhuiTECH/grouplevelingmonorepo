import React, { useMemo } from 'react';
import { Group, Image, rect, SkImage } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';
import { SkiaSpritesheet } from './SkiaSpritesheet';
import { CustomTileMetadata } from '../../contexts/TileContext';

interface SkiaTileProps {
  tile: any;
  absPx: number;
  absPy: number;
  tileSize: number;
  images: Map<string, SkImage>;
  mapSettings: any;
  animationFrame: SharedValue<number>;
  foamOpacity: SharedValue<number>;
  isProp?: boolean;
  dictionaryData?: CustomTileMetadata;
}

const DIRT_TILE_MAP: Record<number, {x: number, y: number}> = {
  0:  { x: 6, y: 5 }, 8:  { x: 4, y: 5 }, 1:  { x: 5, y: 4 }, 2:  { x: 4, y: 1 },
  4:  { x: 8, y: 4 }, 10: { x: 4, y: 3 }, 5:  { x: 6, y: 4 }, 9:  { x: 5, y: 5 },
  3:  { x: 5, y: 2 }, 6:  { x: 8, y: 2 }, 12: { x: 8, y: 5 }, 11: { x: 5, y: 3 },
  7:  { x: 6, y: 2 }, 14: { x: 8, y: 3 }, 13: { x: 6, y: 6 }, 15: { x: 6, y: 3 }
};

const SkiaTileInternal: React.FC<SkiaTileProps> = ({
  tile, absPx, absPy, tileSize, images, mapSettings, animationFrame, foamOpacity, isProp, dictionaryData
}) => {
  // Use dictionary data first, then fallback to tile data, then default to 64
  const frameWidth = dictionaryData?.frame_width ?? tile.frameWidth ?? tile.frame_width ?? 48;
  const frameHeight = dictionaryData?.frame_height ?? tile.frameHeight ?? tile.frame_height ?? 48;

  const displayWidth = frameWidth * (tileSize / 48);
  const displayHeight = frameHeight * (tileSize / 48);
  const offsetX = tile.offsetX || 0;
  const offsetY = tile.offsetY || 0;

  const destRect = useMemo(() => rect(
    absPx - (displayWidth - tileSize) / 2 + offsetX,
    absPy - (displayHeight - tileSize) + offsetY,
    displayWidth,
    displayHeight
  ), [absPx, absPy, displayWidth, displayHeight, offsetX, offsetY, tileSize]);

  // Handle Foam Layer (Now uses dictionary lookup for foam strip)
  let foamLayer = null;
  if (!isProp && tile.foamBitmask > 0 && mapSettings?.foam_sheet_url) {
    const foamImg = images.get(mapSettings.foam_sheet_url);
    if (foamImg) {
      // Corrected Foam Logic matching MapCanvas.tsx
      const col = (tile.foamBitmask || 0) % 4;
      const row = Math.floor((tile.foamBitmask || 0) / 4);
      
      // Calculate source rect for the foam sprite
      // Assumes 48x48 foam tiles in sheet
      const foamSrcRect = rect(col * 48, row * 48, 48, 48);
      
      // Foam is rendered at the base tile position (48x48), ignoring the prop size
      const foamDestRect = rect(absPx, absPy, tileSize, tileSize);
      
      foamLayer = (
        <Group opacity={foamOpacity}>
          <Image image={foamImg} src={foamSrcRect} rect={foamDestRect} />
        </Group>
      );
    }
  }

  // Handle Auto-Tile Layer (Layer 0 only)
  let baseLayer = null;
  if (!isProp && tile.isAutoTile) {
    let activeUrl = mapSettings?.autotile_sheet_url;
    let smartType = tile.smartType || 'grass';
    
    if (smartType === 'dirt' && mapSettings?.dirt_sheet_url) {
      activeUrl = mapSettings.dirt_sheet_url;
    }

    const img = images.get(activeUrl);
    if (img) {
      const baseDestRect = rect(absPx, absPy, tileSize, tileSize);

      if (smartType === 'grass') {
        const variantSeed = Math.abs((tile.absX * 73856093) ^ (tile.absY * 19349663)) % 81;
        const col = variantSeed % 9;
        const row = Math.floor(variantSeed / 9);
        const srcRect = rect(col * 48, row * 48, 48, 48);
        baseLayer = <Image image={img} src={srcRect} rect={baseDestRect} />;
      } else if (smartType === 'dirt') {
        const mapping = DIRT_TILE_MAP[tile.bitmask || 0] || DIRT_TILE_MAP[0];
        const srcRect = rect(mapping.x * 48, mapping.y * 48, 48, 48);
        baseLayer = <Image image={img} src={srcRect} rect={baseDestRect} />;
      } else {
        const col = (tile.bitmask || 0) % 4;
        const row = Math.floor((tile.bitmask || 0) / 4);
        const srcRect = rect(col * 48, row * 48, 48, 48);
        baseLayer = <Image image={img} src={srcRect} rect={baseDestRect} />;
      }
    }
    
    return (
      <Group origin={{ x: baseDestRect.x + baseDestRect.width / 2, y: baseDestRect.y + baseDestRect.height / 2 }} transform={tile.rotation ? [{ rotate: (tile.rotation * Math.PI) / 180 }] : []}>
        {foamLayer}
        {baseLayer}
      </Group>
    );
  }

  // Standard or Spritesheet Tile
  const cleanUrl = tile.imageUrl?.split('?')[0];
  const img = cleanUrl ? images.get(cleanUrl) : null;
  if (img) {
    // 1. O(1) Dictionary Lookup for absolute truth
    const isSpritesheet = dictionaryData?.is_spritesheet ?? !!(tile.isSpritesheet || tile.is_spritesheet || tile.spritesheet || tile.is_sprite_sheet);
    const numFrames = Number(dictionaryData?.frame_count ?? tile.frameCount ?? tile.frame_count ?? tile.totalFrames ?? tile.total_frames ?? tile.frames ?? 1);
    
    // Convert animation_speed to duration in seconds.
    // If dictionaryData.animation_speed is 0.8, it means the whole animation takes 0.8 seconds.
    const speed = Number(dictionaryData?.animation_speed ?? tile.animationSpeed ?? tile.animation_speed ?? tile.duration_ms / 1000 ?? tile.duration_secs ?? 1);

    if (isSpritesheet || numFrames >= 2) {
      // If it's a spritesheet, ALWAYS use the spritesheet logic to ensure clipping, 
      // even if it only has 1 frame (prevents showing full ass horizontal strips).
      return (
        <Group origin={{ x: destRect.x + destRect.width / 2, y: destRect.y + destRect.height / 2 }} transform={tile.rotation ? [{ rotate: (tile.rotation * Math.PI) / 180 }] : []}>
          {foamLayer}
          <SkiaSpritesheet
            image={img}
            numFrames={numFrames}
            durationSecs={speed}
            destRect={destRect}
            animationFrame={animationFrame}
          />
        </Group>
      );
    } else {
      return (
        <Group origin={{ x: destRect.x + destRect.width / 2, y: destRect.y + destRect.height / 2 }} transform={tile.rotation ? [{ rotate: (tile.rotation * Math.PI) / 180 }] : []}>
          {foamLayer}
          <Image image={img} rect={destRect} />
        </Group>
      );
    }
  }

  return null;
};

export const SkiaTile = React.memo(SkiaTileInternal, (prev, next) => {
  // Custom comparison to prevent re-renders when tile objects are recreated but data is identical
  if (prev.absPx !== next.absPx) return false;
  if (prev.absPy !== next.absPy) return false;
  if (prev.tileSize !== next.tileSize) return false;
  if (prev.isProp !== next.isProp) return false;
  if (prev.mapSettings !== next.mapSettings) return false;
  if (prev.dictionaryData !== next.dictionaryData) return false;
  
  // CRITICAL: Don't compare the whole images Map reference.
  // Only re-render if the specific image this tile needs has changed/loaded.
  const prevCleanUrl = prev.tile.imageUrl?.split('?')[0];
  const nextCleanUrl = next.tile.imageUrl?.split('?')[0];
  if (prevCleanUrl !== nextCleanUrl) return false;
  if (prev.images.get(prevCleanUrl || '') !== next.images.get(nextCleanUrl || '')) return false;

  // Deepish compare of the tile data that matters
  const t1 = prev.tile;
  const t2 = next.tile;
  if (t1.layer !== t2.layer) return false;
  if (t1.rotation !== t2.rotation) return false;
  if (t1.offsetX !== t2.offsetX) return false;
  if (t1.offsetY !== t2.offsetY) return false;
  if (t1.isAutoTile !== t2.isAutoTile) return false;
  if (t1.bitmask !== t2.bitmask) return false;
  if (t1.foamBitmask !== t2.foamBitmask) return false;
  if (t1.smartType !== t2.smartType) return false;
  
  return true;
});
