'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Application, extend, useTick } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { useMapStore, Tile, CustomTile } from '@/lib/store/mapStore';
import { getA2SubTileCoordinates } from './mapUtils';

// Register PixiJS components for use in JSX
extend(PIXI);

// Declare the pixi elements for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      pixiContainer: any;
      pixiSprite: any;
      pixiGraphics: any;
    }
  }
}

interface PixiMapCanvasProps {
  width: number; // Viewport/Container width
  height: number; // Viewport/Container height
  worldSize: number; // Total world size (e.g. 128000)
  transform: { x: number; y: number; scale: number }; // From react-zoom-pan-pinch
  onPropMouseDown?: (tileId: string, e: any) => void;
  waterBaseTile?: CustomTile;
  foamStripTile?: CustomTile;
}

const TILE_SIZE = 48;

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
  texture, 
  x, 
  y, 
  width, 
  height, 
  rotation, 
  onMouseDown, 
  isInteractive,
  foamTexture,
  foamOpacity
}: { 
  texture: PIXI.Texture | null; 
  x: number; 
  y: number; 
  width: number; 
  height: number; 
  rotation: number;
  onMouseDown?: (e: any) => void;
  isInteractive: boolean;
  foamTexture?: PIXI.Texture | null;
  foamOpacity?: number;
}) => {
  const drawPinkSquare = React.useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.rect(0, 0, width || 48, height || 48).fill({ color: 0xFF00FF, alpha: 0.8 });
  }, [width, height]);

  return (
    <pixiContainer position={[x, y]} rotation={rotation * (Math.PI / 180)}>
      {foamTexture && (
        <pixiSprite 
          texture={foamTexture}
          x={0} 
          y={0} 
          width={48}
          height={48}
          alpha={foamOpacity || 0.8}
        />
      )}
      
      {texture ? (
        <pixiSprite 
          texture={texture} 
          width={width} 
          height={height}
          eventMode={isInteractive ? 'static' : 'none'}
          onpointerdown={onMouseDown}
          cursor={isInteractive ? 'move' : 'default'}
        />
      ) : (
        <pixiGraphics draw={drawPinkSquare} />
      )}
    </pixiContainer>
  );
});

PixiTile.displayName = 'PixiTile';

// --- Smart Tile Component that handles its own logic/loading ---
const SmartPixiTile = React.memo(({ 
  tile, 
  customTiles, 
  autoTileSheetUrl, 
  dirtSheetUrl, 
  isFoamEnabled, 
  foamStripTile, 
  worldSize, 
  foamOpacity,
  onPropMouseDown
}: {
  tile: Tile;
  customTiles: CustomTile[];
  autoTileSheetUrl?: string | null;
  dirtSheetUrl?: string | null;
  isFoamEnabled: boolean;
  foamStripTile?: CustomTile;
  worldSize: number;
  foamOpacity: number;
  onPropMouseDown?: (tileId: string, e: any) => void;
}) => {
  const liveCustomTile = customTiles.find(ct => ct.url === tile.imageUrl);
  const tileLayer = tile.layer || 0;
  
  let mainUrl = tile.imageUrl;
  let effectiveSmartType = tile.smartType || 'grass';
  
  if (tile.isAutoTile && tileLayer === 0) {
    if (effectiveSmartType === 'dirt' && dirtSheetUrl) {
      mainUrl = dirtSheetUrl;
    } else if (autoTileSheetUrl) {
      mainUrl = autoTileSheetUrl;
    }
  }

  const mainTextureBase = useTexture(mainUrl);
  const foamUrl = (isFoamEnabled && foamStripTile?.url && (tile.foamBitmask || 0) > 0) ? foamStripTile.url : null;
  const foamTextureBase = useTexture(foamUrl);

  const displayWidth = liveCustomTile?.frameWidth || tile.frameWidth || TILE_SIZE;
  const displayHeight = liveCustomTile?.frameHeight || tile.frameHeight || TILE_SIZE;

  const texture = useMemo(() => {
    if (!mainTextureBase) return null;

    if (tile.isAutoTile && tileLayer === 0) {
      const coords = getA2SubTileCoordinates(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0);
      try {
        const source = mainTextureBase.source;
        if (source && source.width >= coords.sourceX + TILE_SIZE && source.height >= coords.sourceY + TILE_SIZE) {
          return new PIXI.Texture({
            source,
            frame: new PIXI.Rectangle(coords.sourceX, coords.sourceY, TILE_SIZE, TILE_SIZE)
          });
        }
      } catch(e) { return null; }
    } else if (tile.isSpritesheet && tile.frameCount && tile.frameCount > 1) {
       const speed = liveCustomTile?.animationSpeed || tile.animationSpeed || 1;
       const frameTotal = liveCustomTile?.frameCount || tile.frameCount || 1;
       const frameIdx = Math.floor((Date.now() / (speed * 1000) * frameTotal) % frameTotal);
       try {
          const source = mainTextureBase.source;
          if (source && source.width >= (frameIdx + 1) * displayWidth && source.height >= displayHeight) {
            return new PIXI.Texture({
              source,
              frame: new PIXI.Rectangle(frameIdx * displayWidth, 0, displayWidth, displayHeight)
            });
          }
       } catch(e) { return null; }
    }
    
    return mainTextureBase;
  }, [mainTextureBase, tile.isAutoTile, tileLayer, tile.bitmask, tile.blockCol, tile.blockRow, tile.isSpritesheet, tile.frameCount, tile.animationSpeed, liveCustomTile, displayWidth, displayHeight]);

  const foamTexture = useMemo(() => {
    if (!foamTextureBase) return null;
    const col = (tile.foamBitmask || 0) % 4;
    const row = Math.floor((tile.foamBitmask || 0) / 4);
    try {
      const source = foamTextureBase.source;
      if (source && source.width >= (col + 1) * TILE_SIZE && source.height >= (row + 1) * TILE_SIZE) {
        return new PIXI.Texture({
          source,
          frame: new PIXI.Rectangle(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        });
      }
    } catch(e) { return null; }
    return null;
  }, [foamTextureBase, tile.foamBitmask]);

  const x = tile.x * TILE_SIZE + worldSize / 2 + (tile.offsetX || 0) - (displayWidth - TILE_SIZE)/2;
  const y = tile.y * TILE_SIZE + worldSize / 2 + (tile.offsetY || 0) - (displayHeight - TILE_SIZE);

  return (
    <PixiTile
      texture={texture}
      x={x}
      y={y}
      width={displayWidth}
      height={displayHeight}
      rotation={tile.rotation || 0}
      isInteractive={tileLayer === 1 || tileLayer === 2}
      onMouseDown={(e) => onPropMouseDown?.(tile.id, e)}
      foamTexture={foamTexture}
      foamOpacity={foamOpacity}
    />
  );
});

SmartPixiTile.displayName = 'SmartPixiTile';

const FoamAnimator = ({ onUpdate }: { onUpdate: (val: number) => void }) => {
  useTick(() => {
    const time = Date.now() / 1000;
    const val = 0.75 + Math.sin(time * 2) * 0.15; 
    onUpdate(val);
  });
  return null;
};

export const PixiMapCanvas: React.FC<PixiMapCanvasProps> = ({ 
  width, height, worldSize, transform, onPropMouseDown, waterBaseTile, foamStripTile 
}) => {
  const { tiles, isFoamEnabled, autoTileSheetUrl, dirtSheetUrl, layerSettings, selection, customTiles } = useMapStore();
  const [foamOpacity, setFoamOpacity] = useState(0.8);

  // Culling Logic
  const visibleTiles = useMemo(() => {
    const BUFFER = 1000 / transform.scale; 
    const visibleLeft = -transform.x / transform.scale;
    const visibleTop = -transform.y / transform.scale;
    const visibleRight = visibleLeft + (width / transform.scale);
    const visibleBottom = visibleTop + (height / transform.scale);

    const filtered = tiles.filter(tile => {
      if (layerSettings[tile.layer || 0]?.hidden) return false;

      const liveCustomTile = customTiles.find(ct => ct.url === tile.imageUrl);
      const displayWidth = liveCustomTile?.frameWidth || tile.frameWidth || TILE_SIZE;
      const displayHeight = liveCustomTile?.frameHeight || tile.frameHeight || TILE_SIZE;

      const x = tile.x * TILE_SIZE + worldSize / 2 + (tile.offsetX || 0) - (displayWidth - TILE_SIZE)/2;
      const y = tile.y * TILE_SIZE + worldSize / 2 + (tile.offsetY || 0) - (displayHeight - TILE_SIZE);

      return (
        x + displayWidth >= visibleLeft - BUFFER &&
        x <= visibleRight + BUFFER &&
        y + displayHeight >= visibleTop - BUFFER &&
        y <= visibleBottom + BUFFER
      );
    });

    return filtered.sort((a, b) => {
      const layerDiff = (a.layer || 0) - (b.layer || 0);
      if (layerDiff !== 0) return layerDiff;
      return (a.y * TILE_SIZE + (a.offsetY || 0)) - (b.y * TILE_SIZE + (b.offsetY || 0));
    });
  }, [tiles, transform, width, height, layerSettings, worldSize, customTiles]);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e3253593-de95-4d0a-9242-349fb357def6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PixiMapCanvas.tsx:RENDER',message:'Render data',data:{width,height,transform,visibleTilesCount:visibleTiles.length},timestamp:Date.now(),runId:'post-fix',hypothesisId:'viewport-dimensions'})}).catch(()=>{});
  // #endregion

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

    g.rect(x, y, selWidth, selHeight)
     .fill({ color: 0x22d3ee, alpha: 0.2 })
     .stroke({ width: 2 / transform.scale, color: 0x22d3ee });
  }, [selection, transform.scale, worldSize]);

  const selectionRef = React.useRef<PIXI.Graphics>(null);

  React.useEffect(() => {
    if (selectionRef.current) {
      drawSelection(selectionRef.current);
    }
  }, [drawSelection]);

  return (
    <Application 
      width={width || 800} 
      height={height || 600} 
      backgroundColor={0xFF0000} 
      backgroundAlpha={0.3}      
      antialias={false}
      resolution={window.devicePixelRatio || 1}
      autoDensity={true}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none', 
        zIndex: 9999 
      }}
    >
      <FoamAnimator onUpdate={setFoamOpacity} />
      
      <pixiContainer 
        position={[transform.x, transform.y]} 
        scale={transform.scale}
        // #region agent log
        onpointerdown={() => {
          fetch('http://127.0.0.1:7242/ingest/e3253593-de95-4d0a-9242-349fb357def6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PixiMapCanvas.tsx:CONTAINER',message:'Container clicked',data:{x:transform.x,y:transform.y,scale:transform.scale},timestamp:Date.now(),runId:'post-fix'})}).catch(()=>{});
        }}
        // #endregion
      >
        {/* Debug: World Center Box (pink) */}
        <pixiGraphics 
          draw={(g) => {
            g.clear();
            g.rect(worldSize / 2 - 50, worldSize / 2 - 50, 100, 100).fill({ color: 0xFF00FF, alpha: 0.5 });
          }}
        />

        {tiles.map(tile => (
          <SmartPixiTile
            key={`${tile.id}-${tile.bitmask}-${tile.foamBitmask}`}
            tile={tile}
            customTiles={customTiles}
            autoTileSheetUrl={autoTileSheetUrl}
            dirtSheetUrl={dirtSheetUrl}
            isFoamEnabled={isFoamEnabled}
            foamStripTile={foamStripTile}
            worldSize={worldSize}
            foamOpacity={foamOpacity}
            onPropMouseDown={onPropMouseDown}
          />
        ))}
        
        <pixiGraphics ref={selectionRef} />
      </pixiContainer>
    </Application>
  );
};
