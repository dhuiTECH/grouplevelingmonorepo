'use client';
import React from 'react';
import { useMapStore } from '@/lib/store/mapStore';

interface MapCanvasProps {
  width: number;
  height: number;
  scale: number;
  onPropMouseDown?: (tileId: string, e: React.MouseEvent) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({ width, height, onPropMouseDown }) => {
  const { tiles } = useMapStore();
  const TILE_SIZE = 64;

  // Sort tiles by layer to ensure ground is drawn before objects
  const sortedTiles = [...tiles].sort((a, b) => (a.layer || 0) - (b.layer || 0));

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
      {sortedTiles.map((tile) => {
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
      
      <style jsx global>{`
        @keyframes spritesheet-animation {
          from { transform: translateX(0); }
          to { transform: translateX(calc(-100% + (100% / var(--frame-count)))); }
        }
        .spritesheet-inner {
          animation: spritesheet-animation var(--animation-speed, 1s) steps(calc(var(--frame-count) - 1)) infinite;
        }
      `}</style>
    </div>
  );
};
