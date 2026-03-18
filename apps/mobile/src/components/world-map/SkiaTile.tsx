import React, { useMemo } from 'react';
import { Group, Image, rect, SkImage, Paint, FilterMode } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
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

  // REMOVED Math.round to prevent sub-pixel "snapping" jitter during map movement
  const displayWidth = frameWidth * (tileSize / 48);
  const displayHeight = frameHeight * (tileSize / 48);
  const offsetX = tile.offsetX || 0;
  const offsetY = tile.offsetY || 0;

  // Lock the destination rect to the pixel grid to stop Nearest Neighbor tearing
  const destRect = useMemo(() => rect(
    Math.round(absPx - (displayWidth - tileSize) / 2 + offsetX),
    Math.round(absPy - (displayHeight - tileSize) + offsetY),
    Math.round(displayWidth),
    Math.round(displayHeight)
  ), [absPx, absPy, displayWidth, displayHeight, offsetX, offsetY, tileSize]);

  // Handle Foam Layer (Now uses dictionary lookup for foam strip)
  let foamLayer = null;
  if (!isProp && tile.foamBitmask > 0 && mapSettings?.cleanFoamSheetUrl) {
    const foamImg = images.get(mapSettings.cleanFoamSheetUrl);
    if (foamImg) {
      // Use mapUtils mapping for foam strip
      // Default to 0,0 since foam only has one row, and column doesn't matter for Pixi mapping
      const coords = getPixiTextureCoords(tile.foamBitmask || 0, 0, 0)[0];
      
      // Foam is rendered at the base tile position (48x48), ignoring the prop size
      // Remove the + 1 hack. Strict 48x48 clipping to prevent spritesheet bleed.
      const foamDestRect = rect(Math.round(absPx), Math.round(absPy), Math.ceil(tileSize), Math.ceil(tileSize));
      
      foamLayer = (
        <Group opacity={foamOpacity} clip={foamDestRect}>
          <Image 
            image={foamImg} 
            sampling={{ filter: FilterMode.Nearest }}
            antiAlias={false}
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
  
  // NOTE: Render sprite-sheet tiles when:
  //   • tile.isAutoTile === true  → live auto-tile (bitmask recalculated by neighbours)
  //   • tile.smartType set        → frozen/pasted copy (isAutoTile: false); bitmask defaults to 0 if undefined
  //     (smart tiles have imageUrl='' so they MUST use the sprite-sheet path or they're invisible)
  const isFrozenSmart = !tile.isAutoTile && !!tile.smartType;
  if (tile.isAutoTile || isFrozenSmart) {
    let activeUrl = mapSettings?.autotile_sheet_url;
    let smartType = tile.smartType || 'grass';
    
    // Fallbacks to use the appropriate sprite sheet URL based on the tile type
    if (smartType === 'dirt' && mapSettings?.dirt_sheet_url) {
      activeUrl = mapSettings.dirt_sheet_url;
    } else if (smartType === 'water' && mapSettings?.water_sheet_url) {
      activeUrl = mapSettings.water_sheet_url;
    } else if (smartType === 'dirtv2' && mapSettings?.dirtv2_sheet_url) {
      activeUrl = mapSettings.dirtv2_sheet_url;
    } else if (smartType === 'waterv2' && mapSettings?.waterv2_sheet_url) {
      activeUrl = mapSettings.waterv2_sheet_url;
    }

    // DEBUG LOG TO SEE WHAT URL IS BEING USED
    // console.log(`Tile ${tile.x},${tile.y} [${smartType}] activeUrl:`, activeUrl, 'isProp:', isProp, 'isAutoTile:', tile.isAutoTile);

    const cleanSheetUrl = activeUrl && mapSettings
      ? (smartType === 'dirt' ? mapSettings.cleanDirtSheetUrl : 
         smartType === 'water' ? mapSettings.cleanWaterSheetUrl : 
         smartType === 'dirtv2' ? mapSettings.cleanDirtv2SheetUrl : 
         smartType === 'waterv2' ? mapSettings.cleanWaterv2SheetUrl : 
         mapSettings.cleanAutotileSheetUrl)
      : undefined;
    const img = cleanSheetUrl ? images.get(cleanSheetUrl) : null;
    
    // Even if it's on a higher layer, smart tiles typically use the base 48x48 grid
    // Remove the + 1 hack. Strict 48x48 clipping to prevent spritesheet bleed.
    let baseDestRect = rect(Math.round(absPx), Math.round(absPy), Math.ceil(tileSize), Math.ceil(tileSize));

    if (img) {
      // Re-calculate the bitmask for the mobile app using the shared function
      const mask = tile.bitmask || 0;
      const blockCol = tile.blockCol !== undefined ? tile.blockCol : (smartType === 'grass' ? 1 : 0);
      const blockRow = tile.blockRow || 0;
      
      const coordsList = (smartType === 'water' || smartType === 'waterv2')
        ? getLiquidTextureCoords(mask, blockCol, blockRow)
        : getPixiTextureCoords(mask, blockCol, blockRow);

      const coords = coordsList[0];
      
      const autoTileTransform = useDerivedValue(() => {
        if (smartType === 'waterv2') {
           const NUM_FRAMES = 3;
           const durationSecs = 1.0; // 1 second loop
           const progress = (animationFrame.value % durationSecs) / durationSecs;
           const frameIndex = Math.floor(progress * NUM_FRAMES) % NUM_FRAMES;
           return [{ translateX: -frameIndex * 576 }];
        }
        return [];
      });

      // Use clipping instead of src prop to ensure correct cropping of large sheets
      baseLayer = (
        <Group clip={baseDestRect}>
          <Paint antiAlias={false} />
          <Group transform={autoTileTransform}>
            <Image 
              image={img} 
              sampling={{ filter: FilterMode.Nearest }}
              antiAlias={false}
              rect={{
                x: absPx - coords.sourceX,
                y: absPy - coords.sourceY,
                width: img.width(),
                height: img.height()
              }}
            />
          </Group>
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

  // Standard or Spritesheet Tile (NOT Auto-Tiled). cleanUrl set when chunk loads (useExploration).
  const cleanUrl = tile.cleanUrl;
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
          <Image image={img} rect={destRect} fit="fill" sampling={{ filter: FilterMode.Nearest }} antiAlias={false} />
        </Group>
      );
    }
  }

  return null;
};

export const SkiaTile = React.memo(SkiaTileInternal, (prev, next) => {
  if (prev.absPx !== next.absPx) return false;
  if (prev.absPy !== next.absPy) return false;
  if (prev.tileSize !== next.tileSize) return false;
  if (prev.isProp !== next.isProp) return false;
  if (prev.mapSettings !== next.mapSettings) return false;
  if (prev.dictionaryData !== next.dictionaryData) return false;

  const prevIsSmart = prev.tile.isAutoTile || (!prev.tile.isAutoTile && !!prev.tile.smartType);
  const nextIsSmart = next.tile.isAutoTile || (!next.tile.isAutoTile && !!next.tile.smartType);
  const prevCleanUrl = prevIsSmart
    ? (prev.tile.smartType === 'dirt' ? prev.mapSettings?.cleanDirtSheetUrl : 
       prev.tile.smartType === 'water' ? prev.mapSettings?.cleanWaterSheetUrl : 
       prev.tile.smartType === 'dirtv2' ? prev.mapSettings?.cleanDirtv2SheetUrl : 
       prev.tile.smartType === 'waterv2' ? prev.mapSettings?.cleanWaterv2SheetUrl : 
       prev.mapSettings?.cleanAutotileSheetUrl)
    : prev.tile.cleanUrl;
  const nextCleanUrl = nextIsSmart
    ? (next.tile.smartType === 'dirt' ? next.mapSettings?.cleanDirtSheetUrl : 
       next.tile.smartType === 'water' ? next.mapSettings?.cleanWaterSheetUrl : 
       next.tile.smartType === 'dirtv2' ? next.mapSettings?.cleanDirtv2SheetUrl : 
       next.tile.smartType === 'waterv2' ? next.mapSettings?.cleanWaterv2SheetUrl : 
       next.mapSettings?.cleanAutotileSheetUrl)
    : next.tile.cleanUrl;

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
