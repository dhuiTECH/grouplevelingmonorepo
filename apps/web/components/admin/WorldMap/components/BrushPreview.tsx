import React from 'react';
import { Tile } from '@/lib/store/mapStore';

interface BrushPreviewProps {
  isSpacePressed: boolean;
  selectedTool: string;
  selectedTileId: string | null;
  customTiles: any[]; // Or Tile[] if possible, used 'any' in original but better be specific
  cursorCoords: { x: number; y: number };
  smoothCursorCoords: { x: number; y: number };
  TILE_SIZE: number;
  WORLD_SIZE: number;
  brushSize: number;
  brushMode: boolean;
  selectedSmartType: string;
  snapMode: 'full' | 'half' | 'free';
}

const HALF_TILE_SIZE = 24; // Default TILE_SIZE / 2, but should be passed or constant

const snapPosition = (smooth: number, snapMode: 'full' | 'half' | 'free', gridCoord: number, tileSize: number, worldSize: number): number => {
  if (snapMode === 'free') return smooth + worldSize / 2;
  const halfTile = tileSize / 2;
  if (snapMode === 'half') return Math.round(smooth / halfTile) * halfTile + worldSize / 2;
  return gridCoord * tileSize + worldSize / 2;
};

export const BrushPreview = React.memo(({
  isSpacePressed, selectedTool, selectedTileId, customTiles, cursorCoords, smoothCursorCoords, TILE_SIZE, WORLD_SIZE, brushSize, brushMode, selectedSmartType, snapMode
}: BrushPreviewProps) => {
  if (isSpacePressed || (selectedTool !== 'paint' && selectedTool !== 'erase' && selectedTool !== 'collision')) return null;
  
  // If painting, we need either a tile OR a smart type active
  if (selectedTool === 'paint' && !selectedTileId && selectedSmartType === 'off') return null;
  
  const tile = (selectedTool === 'paint' || selectedTool === 'collision') ? customTiles.find((t: any) => t.id === selectedTileId) : null;
  const isNotFullSnap = snapMode !== 'full';

  const half = brushMode ? Math.floor(brushSize / 2) : 0;
  const isEven = brushMode && brushSize % 2 === 0;
  const previewTiles = [];

  for (let dy = -half; dy < (isEven ? half : half + 1); dy++) {
    for (let dx = -half; dx < (isEven ? half : half + 1); dx++) {
      previewTiles.push({ dx, dy });
    }
  }

  const leftPos = snapPosition(smoothCursorCoords.x, snapMode, cursorCoords.x, TILE_SIZE, WORLD_SIZE);
  const topPos = snapPosition(smoothCursorCoords.y, snapMode, cursorCoords.y, TILE_SIZE, WORLD_SIZE);

  return (
    <div 
      className="absolute pointer-events-none z-[60]"
      style={{
        left: leftPos,
        top: topPos,
      }}
    >
      {previewTiles.map(({ dx, dy }, i) => {
        if (selectedTool === 'erase' || selectedTool === 'collision') {
          const isCollision = selectedTool === 'collision';
          return (
            <div 
              key={i}
              className={`absolute ${isCollision ? 'bg-orange-500/30 border-orange-500/50' : 'bg-red-500/30 border-red-500/50'}`}
              style={{
                left: dx * TILE_SIZE,
                top: dy * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
            />
          );
        }

        // If we're painting but have no specific tile template (e.g. pure smart brush)
        if (!tile && selectedSmartType !== 'off') {
           return (
            <div 
              key={i}
              className="absolute bg-green-500/30 border border-green-500/50"
              style={{
                left: dx * TILE_SIZE,
                top: dy * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
              }}
            />
          );
        }

        if (!tile) return null;
        const displayHeight = tile.frameHeight || TILE_SIZE;
        const displayWidth = tile.frameWidth || displayHeight;

        // If not full-snap, leftPos/topPos is the mouse. Center/bottom-align on it.
        // If full-snap, leftPos/topPos is grid top-left. Center/bottom-align on the grid cell.
        const left = isNotFullSnap
          ? dx * TILE_SIZE - (displayWidth / 2)
          : dx * TILE_SIZE - (displayWidth - TILE_SIZE) / 2;
        
        const top = isNotFullSnap
          ? dy * TILE_SIZE - displayHeight
          : dy * TILE_SIZE - (displayHeight - TILE_SIZE);

        return (
          <div 
            key={i}
            className="absolute"
            style={{
              left,
              top,
              width: displayWidth,
              height: displayHeight,
            }}
          >
            <div className="absolute inset-0 bg-green-500/20 border border-green-500/40 z-10" />
            <div 
              className="absolute inset-0 opacity-50"
              style={{
                backgroundImage: `url(${tile.url})`,
                backgroundSize: 'auto 100%',
                backgroundPosition: '0 0',
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                transform: `rotate(${tile.rotation || 0}deg)`,
                transformOrigin: 'center center'
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

BrushPreview.displayName = 'BrushPreview';
