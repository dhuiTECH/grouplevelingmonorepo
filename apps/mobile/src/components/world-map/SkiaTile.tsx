import React, { useMemo } from 'react';
import { Group, Image, rect, SkImage, Paint, FilterMode } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';
import { SkiaSpritesheet } from './SkiaSpritesheet';
import { CustomTileMetadata } from '../../contexts/TileContext';
import { getPixiTextureCoords, getLiquidTextureCoords } from './mapUtils';

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

const SkiaTileInternal: React.FC<SkiaTileProps> = ({
  tile, absPx, absPy, tileSize, images, mapSettings, animationFrame, foamOpacity, isProp, dictionaryData
}) => {
  // Use dictionary data first, then fallback to tile data, then default to 64
  const frameWidth = dictionaryData?.frame_width ?? tile.frameWidth ?? tile.frame_width ?? 48;
  const frameHeight = dictionaryData?.frame_height ?? tile.frameHeight ?? tile.frame_height ?? 48;

  const displayWidth = Math.round(frameWidth * (tileSize / 48));
  const displayHeight = Math.round(frameHeight * (tileSize / 48));
  const offsetX = Math.round(tile.offsetX || 0);
  const offsetY = Math.round(tile.offsetY || 0);

  const destRect = useMemo(() => rect(
    absPx - (displayWidth - tileSize) / 2 + offsetX,
    absPy - (displayHeight - tileSize) + offsetY,
    displayWidth + (isProp ? 0 : 1),
    displayHeight + (isProp ? 0 : 1)
  ), [absPx, absPy, displayWidth, displayHeight, offsetX, offsetY, tileSize, isProp]);

  // Handle Foam Layer (Now uses dictionary lookup for foam strip)
  let foamLayer = null;
  if (!isProp && tile.foamBitmask > 0 && mapSettings?.foam_sheet_url) {
    const foamImg = images.get(mapSettings.foam_sheet_url);
    if (foamImg) {
      // Use mapUtils mapping for foam strip
      // Default to 0,0 since foam only has one row, and column doesn't matter for Pixi mapping
      const coords = getPixiTextureCoords(tile.foamBitmask || 0, 0, 0)[0];
      
      // Foam is rendered at the base tile position (48x48), ignoring the prop size
      // We apply 1px overlap to seaming
      const foamDestRect = rect(absPx, absPy, tileSize + 1, tileSize + 1);
      
      foamLayer = (
        <Group opacity={foamOpacity} clip={foamDestRect}>
          <Paint antiAlias={false} />
          <Image 
            image={foamImg} 
            sampling="nearest"
            rect={{
              x: absPx - coords.sourceX,
              y: absPy - coords.sourceY,
              width: foamImg.width(),
              height: foamImg.height()
            }}
          />
        </Group>
      );
    }
  }

  // Handle Auto-Tile Layer (Layer 0 only)
  let baseLayer = null;
  
  // NOTE: If tile.isAutoTile is true, we MUST use the sprite sheet logic.
  // We allow this even for "props" (Layer > 0) because smart tiles can be placed on any layer.
  if (tile.isAutoTile) {
    let activeUrl = mapSettings?.autotile_sheet_url;
    let smartType = tile.smartType || 'grass';
    
    // Fallbacks to use the appropriate sprite sheet URL based on the tile type
    if (smartType === 'dirt' && mapSettings?.dirt_sheet_url) {
      activeUrl = mapSettings.dirt_sheet_url;
    } else if (smartType === 'water' && mapSettings?.water_sheet_url) {
      activeUrl = mapSettings.water_sheet_url;
    }

    // DEBUG LOG TO SEE WHAT URL IS BEING USED
    // console.log(`Tile ${tile.x},${tile.y} [${smartType}] activeUrl:`, activeUrl, 'isProp:', isProp, 'isAutoTile:', tile.isAutoTile);

    // Try finding the preloaded image for this URL 
    const img = activeUrl ? images.get(activeUrl.split('?')[0]) : null;
    
    // Even if it's on a higher layer, smart tiles typically use the base 48x48 grid
    // We apply 1px overlap for seaming
    let baseDestRect = rect(absPx, absPy, tileSize + 1, tileSize + 1);

    if (img) {
      // Re-calculate the bitmask for the mobile app using the shared function
      const mask = tile.bitmask || 0;
      const blockCol = tile.blockCol !== undefined ? tile.blockCol : (smartType === 'grass' ? 1 : 0);
      const blockRow = tile.blockRow || 0;
      
      const coordsList = smartType === 'water'
        ? getLiquidTextureCoords(mask, blockCol, blockRow)
        : getPixiTextureCoords(mask, blockCol, blockRow);

      const coords = coordsList[0];
      
      // Use clipping instead of src prop to ensure correct cropping of large sheets
      baseLayer = (
        <Group clip={baseDestRect}>
          <Paint antiAlias={false} />
          <Image 
            image={img} 
            sampling="nearest"
            rect={{
              x: absPx - coords.sourceX,
              y: absPy - coords.sourceY,
              width: img.width(),
              height: img.height()
            }}
          />
        </Group>
      );
    }
    
    return (
      <Group origin={{ x: baseDestRect.x + baseDestRect.width / 2, y: baseDestRect.y + baseDestRect.height / 2 }} transform={tile.rotation ? [{ rotate: (tile.rotation * Math.PI) / 180 }] : []}>
        {foamLayer}
        {baseLayer}
      </Group>
    );
  }

  // Standard or Spritesheet Tile (NOT Auto-Tiled)
  const cleanUrl = tile.cleanUrl || tile.imageUrl?.split('?')[0];
  const img = cleanUrl ? images.get(cleanUrl) : null;
  if (img) {
    // 1. O(1) Dictionary Lookup for absolute truth
    const isSpritesheet = dictionaryData?.is_spritesheet ?? !!(tile.isSpritesheet || tile.is_spritesheet || tile.spritesheet || tile.is_sprite_sheet);
    const numFrames = Number(dictionaryData?.frame_count ?? tile.frameCount ?? tile.frame_count ?? tile.totalFrames ?? tile.total_frames ?? tile.frames ?? 1);
    
    // 2. ANIMATION SPEED FIX:
    // In web, animationSpeed (e.g. 0.8) means 1 tick every 100ms * speed.
    // So speed 0.8 means 8 frames per second.
    // In mobile, we need durationSecs for the WHOLE cycle.
    // So: durationSecs = numFrames / (10 * animationSpeed)
    const rawSpeed = Number(dictionaryData?.animation_speed ?? tile.animationSpeed ?? tile.animation_speed ?? 0.8);
    const durationSecs = numFrames / (10 * rawSpeed);

    if (isSpritesheet || numFrames >= 2) {
      // If it's a spritesheet, ALWAYS use the spritesheet logic to ensure clipping, 
      // even if it only has 1 frame (prevents showing full ass horizontal strips).
      return (
        <Group origin={{ x: destRect.x + destRect.width / 2, y: destRect.y + destRect.height / 2 }} transform={tile.rotation ? [{ rotate: (tile.rotation * Math.PI) / 180 }] : []}>
          {foamLayer}
          <SkiaSpritesheet
            image={img}
            numFrames={numFrames}
            durationSecs={durationSecs}
            destRect={destRect}
            animationFrame={animationFrame}
          />
        </Group>
      );
    } else {
      return (
        <Group origin={{ x: destRect.x + destRect.width / 2, y: destRect.y + destRect.height / 2 }} transform={tile.rotation ? [{ rotate: (tile.rotation * Math.PI) / 180 }] : []}>
          {foamLayer}
          <Paint antiAlias={false} />
          <Image image={img} rect={destRect} fit="fill" sampling="nearest" />
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
  let prevCleanUrl = prev.tile.cleanUrl || prev.tile.imageUrl?.split('?')[0];
  let nextCleanUrl = next.tile.cleanUrl || next.tile.imageUrl?.split('?')[0];

  // If it's a smart tile, we actually care about the sprite sheet url, not the fake icon url
  if (prev.tile.isAutoTile) {
    let smartType = prev.tile.smartType || 'grass';
    if (smartType === 'dirt' && prev.mapSettings?.dirt_sheet_url) prevCleanUrl = prev.mapSettings.dirt_sheet_url.split('?')[0];
    else if (smartType === 'water' && prev.mapSettings?.water_sheet_url) prevCleanUrl = prev.mapSettings.water_sheet_url.split('?')[0];
    else prevCleanUrl = prev.mapSettings?.autotile_sheet_url?.split('?')[0];
  }
  
  if (next.tile.isAutoTile) {
    let smartType = next.tile.smartType || 'grass';
    if (smartType === 'dirt' && next.mapSettings?.dirt_sheet_url) nextCleanUrl = next.mapSettings.dirt_sheet_url.split('?')[0];
    else if (smartType === 'water' && next.mapSettings?.water_sheet_url) nextCleanUrl = next.mapSettings.water_sheet_url.split('?')[0];
    else nextCleanUrl = next.mapSettings?.autotile_sheet_url?.split('?')[0];
  }

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
  if (t1.blockCol !== t2.blockCol) return false;
  if (t1.blockRow !== t2.blockRow) return false;
  if (t1.edgeBlocks !== t2.edgeBlocks) return false;
  if (t1.isWalkable !== t2.isWalkable) return false;
  
  return true;
});
