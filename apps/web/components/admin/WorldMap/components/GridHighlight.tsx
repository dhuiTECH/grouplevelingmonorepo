import React from 'react';
import { useCursorStore } from '@/lib/store/cursorStore';
import { snapPosition } from '../mapUtils';

interface GridHighlightProps {
  selectedTool: string;
  selectedTileId: string | null;
  customTiles: any[];
  snapMode: 'full' | 'half' | 'free';
}

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;

export const GridHighlight: React.FC<GridHighlightProps> = React.memo(({
  selectedTool,
  selectedTileId,
  customTiles,
  snapMode
}) => {
  const cursorCoords = useCursorStore(state => state.cursorCoords);
  const smoothCursorCoords = useCursorStore(state => state.smoothCursorCoords);

  const selTile = customTiles.find(t => t.id === selectedTileId);
  const h = selTile?.frameHeight || TILE_SIZE;
  const w = selTile?.frameWidth || h;

  return (
    <div 
      className="absolute pointer-events-none" 
      style={{
        left: snapPosition(smoothCursorCoords.x, snapMode, cursorCoords.x, TILE_SIZE, WORLD_SIZE) - (snapMode === 'full' ? 0 : w/2) + (snapMode === 'full' ? 0 : TILE_SIZE/2),
        top: snapPosition(smoothCursorCoords.y, snapMode, cursorCoords.y, TILE_SIZE, WORLD_SIZE) - (snapMode === 'full' ? 0 : h) + (snapMode === 'full' ? 0 : TILE_SIZE),
        width: w,
        height: h,
        backgroundColor: 'rgba(56, 189, 248, 0.2)', 
        border: '1px solid rgba(56, 189, 248, 0.7)',
        zIndex: 60,
        opacity: 0.5 + Math.sin(Date.now() / 150) * 0.3
      }}
    />
  );
});

GridHighlight.displayName = 'GridHighlight';
