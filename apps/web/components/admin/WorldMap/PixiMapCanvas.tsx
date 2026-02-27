'use client';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useMapStore, Tile, CustomTile } from '@/lib/store/mapStore';
import { getPixiTextureCoords } from './mapUtils';

// Register PixiJS components for use in JSX
extend({
  Container: PIXI.Container,
  Sprite: PIXI.Sprite,
  Graphics: PIXI.Graphics,
});

const PixiContainer = 'pixiContainer' as any;
const PixiSprite = 'pixiSprite' as any;
const PixiGraphics = 'pixiGraphics' as any;

interface PixiMapCanvasProps {
  width: number; 
  height: number; 
  worldSize: number; 
  transform: { x: number; y: number; scale: number }; 
  onPropMouseDown?: (tileId: string, e: any) => void;
  waterBaseTile?: CustomTile;
  foamStripTile?: CustomTile;
}

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;

// --- Helper to normalize URLs for comparison (ignoring query params) ---
const normalizeUrl = (url: string | undefined | null) => {
  if (!url) return '';
  return url.split('?')[0];
};

// --- Hook for Async Texture Loading ---
const useTexture = (url: string | undefined | null) => {
  const [texture, setTexture] = useState<PIXI.Texture | null>(null);

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    
    let isMounted = true;

    const load = async () => {
      try {
        const tex = await PIXI.Assets.load({
          src: url,
          data: { crossorigin: 'anonymous' }
        });
        
        if (isMounted) {
          if (tex.source) tex.source.scaleMode = 'nearest';
          setTexture(tex);
        }
      } catch (e) {
        if (isMounted) setTexture(null);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return texture;
};

// --- Sub-component for individual Tile Rendering ---
const PixiTile = React.memo(({ 
  texture, x, y, width, height, rotation, onMouseDown, isInteractive, foamTexture, quarterTextures, foamQuarterTextures
}: { 
  texture: PIXI.Texture | null; x: number; y: number; width: number; height: number; 
  rotation: number; onMouseDown?: (e: any) => void; isInteractive: boolean; 
  foamTexture?: PIXI.Texture | null; 
  quarterTextures?: (PIXI.Texture | null)[];
  foamQuarterTextures?: (PIXI.Texture | null)[];
}) => {
  const drawPinkSquare = React.useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.rect(0, 0, width || 48, height || 48).fill({ color: 0xFF00FF, alpha: 0.8 });
  }, [width, height]);

  return (
    <PixiContainer x={x} y={y} rotation={rotation * (Math.PI / 180)}>
      {/* Foam Layer */}
      {foamQuarterTextures ? (
        <PixiContainer alpha={0.8}>
          {foamQuarterTextures[0] && <PixiSprite texture={foamQuarterTextures[0]} x={0} y={0} width={width} height={height} />}
        </PixiContainer>
      ) : foamTexture && (
        <PixiSprite texture={foamTexture} x={0} y={0} width={48} height={48} alpha={0.8} />
      )}
      
      {/* Main Texture Layer */}
      {quarterTextures ? (
        <PixiContainer 
          eventMode={isInteractive ? 'static' : 'none'} 
          onpointerdown={onMouseDown} 
          cursor={isInteractive ? 'move' : 'default'}
        >
          {quarterTextures[0] && <PixiSprite texture={quarterTextures[0]} x={0} y={0} width={width} height={height} />}
        </PixiContainer>
      ) : texture ? (
        <PixiSprite 
          texture={texture} width={width} height={height}
          eventMode={isInteractive ? 'static' : 'none'} onpointerdown={onMouseDown} cursor={isInteractive ? 'move' : 'default'}
        />
      ) : (
        <PixiGraphics draw={drawPinkSquare} />
      )}
    </PixiContainer>
  );
});

PixiTile.displayName = 'PixiTile';

// --- Smart Tile Component ---
const SmartPixiTile = React.memo(({ 
  tile, customTiles, autoTileSheetUrl, dirtSheetUrl, isFoamEnabled, foamStripTile, worldSize, onPropMouseDown
}: {
  tile: Tile; customTiles: CustomTile[]; autoTileSheetUrl?: string | null; dirtSheetUrl?: string | null;
  isFoamEnabled: boolean; foamStripTile?: CustomTile; worldSize: number; onPropMouseDown?: (tileId: string, e: any) => void;
}) => {
  const globalTick = useMapStore(state => state.globalTick);
  const liveCustomTile = customTiles.find(ct => normalizeUrl(ct.url) === normalizeUrl(tile.imageUrl));
  const tileLayer = tile.layer || 0;
  
  let mainUrl = tile.imageUrl;
  let effectiveSmartType = tile.smartType || 'grass';
  
  if (tile.isAutoTile && tileLayer === 0) {
    if (effectiveSmartType === 'dirt' && dirtSheetUrl) mainUrl = dirtSheetUrl;
    else if (autoTileSheetUrl) mainUrl = autoTileSheetUrl;
  }

  const mainTextureBase = useTexture(mainUrl);
  const foamUrl = (isFoamEnabled && foamStripTile?.url && (tile.foamBitmask || 0) > 0) ? foamStripTile.url : null;
  const foamTextureBase = useTexture(foamUrl);

  const displayWidth = (tile.isAutoTile && tileLayer === 0) ? TILE_SIZE : (liveCustomTile?.frameWidth || tile.frameWidth || TILE_SIZE);
  const displayHeight = (tile.isAutoTile && tileLayer === 0) ? TILE_SIZE : (liveCustomTile?.frameHeight || tile.frameHeight || TILE_SIZE);

  // ANIMATION LOGIC
  const frameCount = liveCustomTile?.frameCount || tile.frameCount || 1;
  const isAnimated = (liveCustomTile?.isSpritesheet || tile.isSpritesheet) && frameCount > 1;
  const speed = Number(liveCustomTile?.animationSpeed || tile.animationSpeed || 1);
  const currentFrame = isAnimated ? Math.floor(globalTick * speed) % frameCount : 0;

  const quarterTextures = useMemo(() => {
    if (!mainTextureBase || !mainTextureBase.source || !tile.isAutoTile || tileLayer !== 0) return null;
    const coords = getPixiTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0);
    try {
      const source = mainTextureBase.source;
      return coords.map(q => new PIXI.Texture({
        source,
        frame: new PIXI.Rectangle(q.sourceX, q.sourceY, q.sourceWidth, q.sourceHeight)
      }));
    } catch(e) { return null; }
  }, [mainTextureBase, tile.isAutoTile, tileLayer, tile.bitmask, tile.blockCol, tile.blockRow]);

  const foamQuarterTextures = useMemo(() => {
    if (!foamTextureBase || !foamTextureBase.source || (tile.foamBitmask || 0) === 0) return null;
    const coords = getPixiTextureCoords(tile.foamBitmask || 0, 0, 0); 
    try {
      const source = foamTextureBase.source;
      return coords.map(q => new PIXI.Texture({
        source,
        frame: new PIXI.Rectangle(q.sourceX, q.sourceY, q.sourceWidth, q.sourceHeight)
      }));
    } catch(e) { return null; }
  }, [foamTextureBase, tile.foamBitmask]);

  const texture = useMemo(() => {
    if (quarterTextures) return null;
    if (!mainTextureBase || !mainTextureBase.source) return null;

    if (isAnimated) {
       try {
          const source = mainTextureBase.source;
          const frameX = currentFrame * displayWidth;
          return new PIXI.Texture({
            source,
            frame: new PIXI.Rectangle(source.width >= frameX + displayWidth ? frameX : 0, 0, displayWidth, displayHeight)
          });
       } catch(e) { return null; }
    } else if ((liveCustomTile?.isSpritesheet || tile.isSpritesheet) && frameCount && frameCount > 1) {
       try {
          const source = mainTextureBase.source;
          if (source.width >= displayWidth && source.height >= displayHeight) {
            return new PIXI.Texture({
              source,
              frame: new PIXI.Rectangle(0, 0, displayWidth, displayHeight)
            });
          }
       } catch(e) { return null; }
    }
    
    return mainTextureBase;
  }, [mainTextureBase, quarterTextures, isAnimated, currentFrame, displayWidth, displayHeight, liveCustomTile, tile.isSpritesheet, frameCount]);

  const foamTexture = useMemo(() => {
    if (foamQuarterTextures || !foamTextureBase || !foamTextureBase.source) return null;
    const col = (tile.foamBitmask || 0) % 4;
    const row = Math.floor((tile.foamBitmask || 0) / 4);
    try {
      const source = foamTextureBase.source;
      if (source.width >= (col + 1) * TILE_SIZE && source.height >= (row + 1) * TILE_SIZE) {
        return new PIXI.Texture({
          source,
          frame: new PIXI.Rectangle(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        });
      }
    } catch(e) { return null; }
    return null;
  }, [foamTextureBase, foamQuarterTextures, tile.foamBitmask]);

  const x = tile.x * TILE_SIZE + worldSize / 2 + (tile.offsetX || 0) - (displayWidth - TILE_SIZE)/2;
  const y = tile.y * TILE_SIZE + worldSize / 2 + (tile.offsetY || 0) - (displayHeight - TILE_SIZE);

  return (
    <PixiTile
      texture={texture} x={x} y={y} width={displayWidth} height={displayHeight}
      rotation={tile.rotation || 0} isInteractive={tileLayer === 1 || tileLayer === 2}
      onMouseDown={(e) => onPropMouseDown?.(tile.id, e)} 
      foamTexture={foamTexture}
      quarterTextures={quarterTextures || undefined}
      foamQuarterTextures={foamQuarterTextures || undefined}
    />
  );
});

SmartPixiTile.displayName = 'SmartPixiTile';

export const PixiMapCanvas: React.FC<PixiMapCanvasProps> = ({ 
  width, height, worldSize, transform, onPropMouseDown, waterBaseTile, foamStripTile 
}) => {
  const { tiles, isFoamEnabled, autoTileSheetUrl, dirtSheetUrl, selection, customTiles } = useMapStore();

  const sortedTiles = useMemo(() => {
    return [...tiles].sort((a, b) => {
      // Primary sort by layer
      const layerA = a.layer || 0;
      const layerB = b.layer || 0;
      if (layerA !== layerB) return layerA - layerB;
      
      // Secondary sort by Y-coordinate for props/objects (Depth sorting)
      // We only depth-sort for layers above ground (layer > 0)
      if (layerA > 0) {
        return (a.y + (a.offsetY || 0) / TILE_SIZE) - (b.y + (b.offsetY || 0) / TILE_SIZE);
      }
      return 0;
    });
  }, [tiles]);

  const drawSelection = React.useCallback((g: PIXI.Graphics) => {
    g.clear();
    if (!selection) return;
    
    const startX = Math.min(selection.start.x, selection.end.x);
    const endX = Math.max(selection.start.x, selection.end.x);
    const startY = Math.min(selection.start.y, selection.end.y);
    const endY = Math.max(selection.start.y, selection.end.y);

    const selWidth = (endX - startX + 1) * TILE_SIZE;
    const selHeight = (endY - startY + 1) * TILE_SIZE;
    
    const x = startX * TILE_SIZE + worldSize / 2;
    const y = startY * TILE_SIZE + worldSize / 2;

    g.rect(x, y, selWidth, selHeight).fill({ color: 0x22d3ee, alpha: 0.2 }).stroke({ width: 2 / transform.scale, color: 0x22d3ee });
  }, [selection, transform.scale, worldSize]);

  const selectionRef = React.useRef<PIXI.Graphics>(null);

  React.useEffect(() => {
    if (selectionRef.current) {
      drawSelection(selectionRef.current);
    }
  }, [drawSelection]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
      <Application 
        width={width || 800} height={height || 600} backgroundColor={0x000000} backgroundAlpha={0}      
        antialias={false} resolution={window.devicePixelRatio || 1} autoDensity={true}
      >
        <PixiContainer x={transform.x} y={transform.y} scale={transform.scale}>
          
          {sortedTiles.map(tile => (
            <SmartPixiTile
              key={`${tile.id}-${tile.bitmask}-${tile.foamBitmask}`} tile={tile} customTiles={customTiles}
              autoTileSheetUrl={autoTileSheetUrl} dirtSheetUrl={dirtSheetUrl} isFoamEnabled={isFoamEnabled}
              foamStripTile={foamStripTile} worldSize={worldSize} onPropMouseDown={onPropMouseDown}
            />
          ))}
          
          <PixiGraphics ref={selectionRef} />
        </PixiContainer>
      </Application>
    </div>
  );
};