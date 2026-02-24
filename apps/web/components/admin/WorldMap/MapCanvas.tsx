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
  const { tiles, isFoamEnabled, autoTileSheetUrl, dirtSheetUrl, terrainOffsets } = useMapStore();
  const TILE_SIZE = 64;

  // Cull tiles outside the viewport for performance
  const visibleTiles = React.useMemo(() => {
    const BUFFER = 256; // Render a few extra tiles around the edges to prevent popping
    
    return tiles.filter(tile => {
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
  }, [tiles, viewport, width, height]);

  return (
    <div 
      className="absolute top-0 left-0"
      style={{ 
        width, 
        height,
        imageRendering: 'pixelated',
        pointerEvents: 'none' // Still none on container so grid is clickable
      }}
    >
      {visibleTiles.map((tile) => {
        // Default to TILE_SIZE if not specified
        const displayWidth = tile.frameWidth || TILE_SIZE;
        const displayHeight = tile.frameHeight || TILE_SIZE;

        // Calculate position: align bottom-center of tile to the bottom-center of the grid cell, then apply offsets
        const offsetX = tile.offsetX || 0;
        const offsetY = tile.offsetY || 0;
        const left = (tile.x * TILE_SIZE + width / 2) - (displayWidth - TILE_SIZE) / 2 + offsetX;
        const top = (tile.y * TILE_SIZE + height / 2) - (displayHeight - TILE_SIZE) + offsetY;

        // Base z-index by layer. For props (layer 1), add their physical Y position so trees lower down overlap trees higher up.
        let zIndex = (tile.layer || 0) * 100000;
        if (tile.layer === 1) {
           zIndex += Math.floor(top + displayHeight);
        }

        // --- AUTO-TILE RENDERING (Ground Layer) ---
        if (tile.isAutoTile && (tile.layer || 0) === 0) {
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
                const typeOffsets = terrainOffsets[effectiveSmartType] || terrainOffsets['grass'];
                const stateOffsets = elevation === 1 ? typeOffsets.raised : typeOffsets.flat;
                
                // Paul Solt 4x4 Grid Mapping inside the block
                const col = bitmask % 4;
                const row = Math.floor(bitmask / 4);
                
                const bgX = -(stateOffsets[0] + col * TILE_SIZE);
                const bgY = -(stateOffsets[1] + row * TILE_SIZE);

                return (
                   <div key={tile.id} style={{ position: 'absolute', left, top, width: TILE_SIZE, height: TILE_SIZE, zIndex }}>
                      {/* Water Base (Bottom Layer) */}
                      {waterBaseTile?.url && (
                        <img src={waterBaseTile.url} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ imageRendering: 'pixelated', zIndex: -1 }} />
                      )}
                      
                      {/* Auto-Tile Block */}
                      <div 
                         style={{
                            width: '100%', height: '100%',
                            backgroundImage: `url(${activeSheet})`,
                            backgroundPosition: `${bgX}px ${bgY}px`,
                            backgroundSize: '1024px 1024px', // 16x16 tiles or 4x4 blocks of 4x4
                            imageRendering: 'pixelated'
                         }}
                      />
                      
                      {/* Foam Overlay */}
                      {isFoamEnabled && foamStripTile?.url && (tile.foamBitmask || 0) > 0 && (
                          <div 
                             className={`foam-overlay ${foamStripTile.isSpritesheet && foamStripTile.frameCount && foamStripTile.frameCount > 1 ? 'spritesheet-animated-foam' : ''}`}
                             style={{
                                position: 'absolute', inset: 0,
                                backgroundImage: `url(${foamStripTile.url})`,
                                backgroundPosition: `-${((tile.foamBitmask || 0) % 4) * TILE_SIZE}px -${Math.floor((tile.foamBitmask || 0) / 4) * TILE_SIZE}px`,
                                backgroundSize: foamStripTile.isSpritesheet && foamStripTile.frameCount ? 
                                  `${foamStripTile.frameCount * 100}% 100%` : '400% 400%',
                                imageRendering: 'pixelated',
                                // @ts-ignore
                                '--foam-frame-count': foamStripTile.frameCount || 1,
                                '--foam-animation-speed': `${foamStripTile.animationSpeed || 1}s`,
                                '--foam-frame-width': `${foamStripTile.frameWidth || TILE_SIZE}px`,
                                '--foam-frame-height': `${foamStripTile.frameHeight || TILE_SIZE}px`,
                             } as React.CSSProperties}
                          />
                      )}
                   </div>
                );
            }
        }

        if (tile.isSpritesheet && tile.frameCount && tile.frameCount > 1) {
          const frameCount = tile.frameCount;
          const speed = tile.animationSpeed || 1;

          return (
            <div
              key={tile.id}
              onMouseDown={(e) => tile.layer === 1 && onPropMouseDown?.(tile.id, e)}
              style={{
                position: 'absolute',
                left,
                top,
                width: displayWidth,
                height: displayHeight,
                overflow: 'hidden',
                zIndex,
                pointerEvents: tile.layer === 1 ? 'auto' : 'none',
                cursor: tile.layer === 1 ? 'move' : 'default'
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
          );
        }

        return (
          <img
            key={tile.id}
            src={tile.imageUrl}
            alt=""
            onMouseDown={(e) => tile.layer === 1 && onPropMouseDown?.(tile.id, e)}
            style={{
              position: 'absolute',
              left,
              top,
              width: displayWidth,
              height: displayHeight,
              pointerEvents: tile.layer === 1 ? 'auto' : 'none',
              imageRendering: 'pixelated',
              zIndex,
              cursor: tile.layer === 1 ? 'move' : 'default'
            }}
          />
        );
      })}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes foam-pulse {
          0%, 100% { opacity: 0.9; transform: scale(1.0); }
          50% { opacity: 0.6; transform: scale(1.02); }
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
