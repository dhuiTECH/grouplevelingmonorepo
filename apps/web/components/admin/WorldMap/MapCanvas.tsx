'use client';
import React from 'react';
import { useMapStore, CustomTile } from '@/lib/store/mapStore';

interface MapCanvasProps {
  width: number;
  height: number;
  scale: number;
  viewport: { x: number, y: number, width: number, height: number };
  onPropMouseDown?: (tileId: string, e: React.MouseEvent) => void;
  waterBaseTile?: CustomTile;
  foamStripTile?: CustomTile;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ 
  width, height, scale, viewport, onPropMouseDown, waterBaseTile, foamStripTile 
}) => {
  const { tiles, isFoamEnabled, autoTileSheetUrl, dirtSheetUrl, terrainOffsets, layerSettings, selection, customTiles } = useMapStore();
  const TILE_SIZE = 48;

  // Cull tiles outside the viewport for performance
  const visibleTiles = React.useMemo(() => {
    const BUFFER = 256; // Render a few extra tiles around the edges to prevent popping
    
    return tiles.filter(tile => {
      // 1. Respect Layer Visibility
      if (layerSettings[tile.layer || 0]?.hidden) return false;

      const displayWidth = tile.frameWidth || TILE_SIZE;
      const displayHeight = tile.frameHeight || TILE_SIZE;
      
      const left = (tile.x * TILE_SIZE + width / 2) - (displayWidth - TILE_SIZE) / 2 + (tile.offsetX || 0);
      const top = (tile.y * TILE_SIZE + height / 2) - (displayHeight - TILE_SIZE) + (tile.offsetY || 0);
      
      return (
        left + displayWidth >= viewport.x - BUFFER &&
        left <= viewport.x + viewport.width + BUFFER &&
        top + displayHeight >= viewport.y - BUFFER &&
        top <= viewport.y + viewport.height + BUFFER
      );
    }).sort((a, b) => (a.layer || 0) - (b.layer || 0));
  }, [tiles, viewport, width, height, layerSettings]);

  // Selection Overlay logic
  const selectionRect = React.useMemo(() => {
    if (!selection) return null;
    const startX = Math.min(selection.start.x, selection.end.x);
    const endX = Math.max(selection.start.x, selection.end.x);
    const startY = Math.min(selection.start.y, selection.end.y);
    const endY = Math.max(selection.start.y, selection.end.y);

    return {
      left: startX * TILE_SIZE + width / 2,
      top: startY * TILE_SIZE + height / 2,
      width: (endX - startX + 1) * TILE_SIZE,
      height: (endY - startY + 1) * TILE_SIZE
    };
  }, [selection, width, height]);

  return (
    <div 
      className="absolute top-0 left-0"
      style={{ 
        width, 
        height,
        imageRendering: 'pixelated',
        pointerEvents: 'none', // Still none on container so grid is clickable
        zIndex: 1 // Traps tiles in a stacking context below nodes
      }}
    >
      {/* Selection Highlight */}
      {selectionRect && (
        <div 
          className="absolute border-2 border-cyan-400 bg-cyan-400/20 z-[1000] animate-pulse pointer-events-none"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
            boxShadow: '0 0 15px rgba(34, 211, 238, 0.5)'
          }}
        />
      )}

      {visibleTiles.map((tile) => {
        // Look up the live tile properties so sidebar edits apply instantly to placed tiles
        const liveCustomTile = customTiles.find(ct => ct.url === tile.imageUrl);

        // Default to TILE_SIZE if not specified
        const displayWidth = liveCustomTile?.frameWidth || tile.frameWidth || TILE_SIZE;
        const displayHeight = liveCustomTile?.frameHeight || tile.frameHeight || TILE_SIZE;
        const isSpritesheet = liveCustomTile?.isSpritesheet ?? tile.isSpritesheet;
        const frameCount = liveCustomTile?.frameCount || tile.frameCount;
        const speed = liveCustomTile?.animationSpeed || tile.animationSpeed || 1;

        // Calculate position: align bottom-center of tile to the bottom-center of the grid cell, then apply offsets
        const offsetX = tile.offsetX || 0;
        const offsetY = tile.offsetY || 0;
        
        let left = (tile.x * TILE_SIZE + width / 2) - (displayWidth - TILE_SIZE) / 2 + offsetX;
        let top = (tile.y * TILE_SIZE + height / 2) - (displayHeight - TILE_SIZE) + offsetY;

        // Base z-index by layer. For roads (layer 1) and props (layer 2), add their physical Y position 
        // so trees/roads lower down overlap ones higher up (Y-sorting).
        const tileLayer = tile.layer !== undefined && tile.layer !== null ? tile.layer : 0;
        let baseZ = (tileLayer + 10) * 100000;
        let zIndex = baseZ;
        
        if (tileLayer === 1 || tileLayer === 2) {
           zIndex += Math.floor(top + displayHeight);
        }

        const rotationTransform = tile.rotation ? `rotate(${tile.rotation}deg)` : '';

        // --- STANDALONE FOAM RENDER ---
        // Render foam as an entirely separate element BELOW the ground
        let foamElement = null;
        if (tile.isAutoTile && tileLayer === 0 && isFoamEnabled && foamStripTile?.url && (tile.foamBitmask || 0) > 0) {
            
            // Re-calculate left/top exactly for the 64x64 grid cell, regardless of this tile's actual display size
            const foamLeft = (tile.x * TILE_SIZE + width / 2);
            const foamTop = (tile.y * TILE_SIZE + height / 2);
            const col = (tile.foamBitmask || 0) % 4;
            const row = Math.floor((tile.foamBitmask || 0) / 4);

            foamElement = (
              <div 
                 key={`${tile.id}-foam-wrap`}
                 className="foam-overlay"
                 style={{
                    position: 'absolute', 
                    left: foamLeft, 
                    top: foamTop, 
                    width: TILE_SIZE, 
                    height: TILE_SIZE, 
                    zIndex: baseZ - 500, // Below layer 0, above layer -1
                    overflow: 'hidden',
                    pointerEvents: 'none',
                 }}
              >
                 <div
                    className={foamStripTile.isSpritesheet && foamStripTile.frameCount && foamStripTile.frameCount > 1 ? 'spritesheet-inner' : ''}
                    style={{
                       width: foamStripTile.isSpritesheet && foamStripTile.frameCount ? `${foamStripTile.frameCount * 100}%` : '100%',
                       height: '100%',
                       backgroundImage: `url(${foamStripTile.url})`,
                       backgroundPosition: foamStripTile.isSpritesheet ? `0px -${row * TILE_SIZE}px` : `-${col * TILE_SIZE}px -${row * TILE_SIZE}px`,
                       backgroundSize: `400% 400%`,
                       backgroundRepeat: 'no-repeat',
                       imageRendering: 'pixelated',
                       // @ts-ignore
                       '--frame-count': foamStripTile.frameCount || 1,
                       '--animation-speed': `${foamStripTile.animationSpeed || 1}s`,
                    }}
                 />
              </div>
            );
        }

        // --- AUTO-TILE RENDERING (Ground Layer) ---
        if (tile.isAutoTile && tileLayer === 0) {
            const elevation = tile.elevation || 0;
            const bitmask = tile.bitmask || 0;
            const smartType = tile.smartType || 'grass';
            
            // Fallback Logic: if Dirt selected but no sheet, use Grass visuals
            let activeSheet = autoTileSheetUrl;
            let effectiveSmartType = smartType;
            
            if (smartType === 'dirt') {
                if (dirtSheetUrl) {
                    activeSheet = dirtSheetUrl;
                } else {
                    effectiveSmartType = 'grass'; // Visual fallback
                }
            }
    
            if (activeSheet) {
                let bgX = 0;
                let bgY = 0;
                let bgSize = `${16 * TILE_SIZE}px ${16 * TILE_SIZE}px`; // Default large size
                
                if (effectiveSmartType === 'dirt') {
                    // Mapping based on a sheet with 48x48 tiles (12 cols, 13 rows)
                    const DIRT_TILE_MAP: Record<number, {x: number, y: number}> = {
                      0:  { x: 6 * TILE_SIZE, y: 5 * TILE_SIZE }, // Isolated 
                      8:  { x: 4 * TILE_SIZE, y: 5 * TILE_SIZE }, // Top neighbor (Bottom Cap)
                      1:  { x: 5 * TILE_SIZE, y: 4 * TILE_SIZE }, // Right neighbor (Left Cap)
                      2:  { x: 4 * TILE_SIZE, y: 1 * TILE_SIZE }, // Bottom neighbor (Top Cap)
                      4:  { x: 8 * TILE_SIZE, y: 4 * TILE_SIZE }, // Left neighbor (Right Cap)
                      10: { x: 4 * TILE_SIZE, y: 3 * TILE_SIZE }, // Top+Bottom (Vertical Straight)
                      5:  { x: 6 * TILE_SIZE, y: 4 * TILE_SIZE }, // Left+Right (Horizontal Straight)
                      9:  { x: 5 * TILE_SIZE, y: 5 * TILE_SIZE }, // Top+Right (Bottom-Left Corner)
                      3:  { x: 5 * TILE_SIZE, y: 2 * TILE_SIZE }, // Right+Bottom (Top-Left Corner)
                      6:  { x: 8 * TILE_SIZE, y: 2 * TILE_SIZE }, // Bottom+Left (Top-Right Corner)
                      12: { x: 8 * TILE_SIZE, y: 5 * TILE_SIZE }, // Left+Top (Bottom-Right Corner)
                      11: { x: 5 * TILE_SIZE, y: 3 * TILE_SIZE }, // Top+Right+Bottom (Left Edge / T-Left)
                      7:  { x: 6 * TILE_SIZE, y: 2 * TILE_SIZE }, // Right+Bottom+Left (Top Edge / T-Up)
                      14: { x: 8 * TILE_SIZE, y: 3 * TILE_SIZE }, // Bottom+Left+Top (Right Edge / T-Right)
                      13: { x: 6 * TILE_SIZE, y: 6 * TILE_SIZE }, // Left+Top+Right (Bottom Edge / T-Down)
                      15: { x: 6 * TILE_SIZE, y: 3 * TILE_SIZE }  // All 4 (Crossroads)
                    };
                    
                    const mapping = DIRT_TILE_MAP[bitmask] || DIRT_TILE_MAP[0];
                    bgX = -mapping.x;
                    bgY = -mapping.y;
                    bgSize = `${12 * TILE_SIZE}px ${13 * TILE_SIZE}px`; // 576px 624px for 48px tiles
                } else if (effectiveSmartType === 'grass') {
                    // 9x9 Randomizer Brush
                    // Use a simple coordinate-based hash for stable randomness
                    const variantSeed = Math.abs((tile.x * 73856093) ^ (tile.y * 19349663)) % 81;
                    const col = variantSeed % 9;
                    const row = Math.floor(variantSeed / 9);
                    
                    bgX = -(col * TILE_SIZE);
                    bgY = -(row * TILE_SIZE);
                    bgSize = `${9 * TILE_SIZE}px ${9 * TILE_SIZE}px`; // 432px 432px for 48px tiles
                } else {
                    const typeOffsets = terrainOffsets[effectiveSmartType] || terrainOffsets['grass'];
                    const stateOffsets = elevation === 1 ? typeOffsets.raised : typeOffsets.flat;
                    
                    // Paul Solt 4x4 Grid Mapping inside the block
                    const col = bitmask % 4;
                    const row = Math.floor(bitmask / 4);
                    
                    bgX = -(stateOffsets[0] + col * TILE_SIZE);
                    bgY = -(stateOffsets[1] + row * TILE_SIZE);
                }

                return (
                  <React.Fragment key={`${tile.id}-auto-frag`}>
                  {foamElement}
                   <div key={tile.id} style={{ position: 'absolute', left, top, width: TILE_SIZE, height: TILE_SIZE, zIndex, transform: rotationTransform }}>
                      {/* Auto-Tile Block */}
                      <div 
                         style={{
                            width: '100%', height: '100%',
                            backgroundImage: `url(${activeSheet})`,
                            backgroundPosition: `${bgX}px ${bgY}px`,
                            backgroundSize: bgSize,
                            imageRendering: 'pixelated'
                         }}
                      />
                   </div>
                  </React.Fragment>
                );
            }
        }

        if (isSpritesheet && frameCount && frameCount > 1) {
          return (
            <React.Fragment key={`${tile.id}-frag`}>
            {foamElement}
            <div
              key={tile.id}
              onMouseDown={(e) => (tileLayer === 1 || tileLayer === 2) && onPropMouseDown?.(tile.id, e)}
              style={{
                position: 'absolute',
                left,
                top,
                width: displayWidth,
                height: displayHeight,
                overflow: 'hidden',
                zIndex,
                transform: rotationTransform,
                pointerEvents: (tileLayer === 1 || tileLayer === 2) ? 'auto' : 'none',
                cursor: (tileLayer === 1 || tileLayer === 2) ? 'move' : 'default'
              }}
            >
              <div
                className="spritesheet-inner"
                style={{
                  width: `${frameCount * 100}%`,
                  height: '100%',
                  backgroundImage: `url(${tile.imageUrl})`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  // @ts-ignore
                  '--frame-count': frameCount,
                  '--animation-speed': `${speed}s`,
                } as any}
              />
            </div>
            </React.Fragment>
          );
        }

          return (
          <React.Fragment key={`${tile.id}-frag`}>
          {foamElement}
          <div
            key={tile.id}
            onMouseDown={(e) => (tileLayer === 1 || tileLayer === 2) && onPropMouseDown?.(tile.id, e)}
            style={{
              position: 'absolute',
              left,
              top,
              width: displayWidth,
              height: displayHeight,
              pointerEvents: (tileLayer === 1 || tileLayer === 2) ? 'auto' : 'none',
              zIndex,
              transform: rotationTransform,
              cursor: (tileLayer === 1 || tileLayer === 2) ? 'move' : 'default'
            }}
          >
            <div
              style={{ 
                width: '100%', 
                height: '100%',
                backgroundImage: `url(${tile.imageUrl})`,
                backgroundSize: 'auto 100%',
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated'
              }}
            />
          </div>
          </React.Fragment>
        );
      })}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes foam-pulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.6; }
        }
        .foam-overlay {
          animation: foam-pulse 2s infinite ease-in-out;
          pointer-events: none;
        }
        
        @keyframes spritesheet-animation {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100% + (100% / var(--frame-count)))); }
        }
        .spritesheet-inner {
          animation: spritesheet-animation var(--animation-speed, 1s) steps(calc(var(--frame-count) - 1)) infinite;
        }

        @keyframes foam-spritesheet-animation {
          from { background-position-x: 0; }
          to { background-position-x: calc(-1 * var(--foam-frame-count) * var(--foam-frame-width)); }
        }
        .spritesheet-animated-foam {
          animation: foam-spritesheet-animation var(--foam-animation-speed) steps(var(--foam-frame-count)) infinite;
        }
      ` }} />
    </div>
  );
};
