import React from 'react';
import { useCursorStore } from '@/lib/store/cursorStore';
import { snapPosition, getPixiTextureCoords, getLiquidTextureCoords, normalizeUrl } from '../mapUtils';

interface StampPreviewProps {
  currentStamp: any[];
  snapMode: 'full' | 'half' | 'free';
  waterSheetUrl?: string | null;
  dirtSheetUrl?: string | null;
  autoTileSheetUrl?: string | null;
  customTiles: any[];
}

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;

export const StampPreview: React.FC<StampPreviewProps> = React.memo(({
  currentStamp,
  snapMode,
  waterSheetUrl,
  dirtSheetUrl,
  autoTileSheetUrl,
  customTiles
}) => {
  const cursorCoords = useCursorStore(state => state.cursorCoords);
  const smoothCursorCoords = useCursorStore(state => state.smoothCursorCoords);

  return (
    <div 
      className="absolute pointer-events-none z-[70] opacity-60"
      style={{
        left: snapPosition(smoothCursorCoords.x, snapMode, cursorCoords.x, TILE_SIZE, WORLD_SIZE),
        top: snapPosition(smoothCursorCoords.y, snapMode, cursorCoords.y, TILE_SIZE, WORLD_SIZE),
      }}
    >
      {currentStamp.map((tile, stampIdx) => {
        const isFrozenSmart = !!tile.smartType && tile.bitmask !== undefined;
        if (isFrozenSmart) {
          const smartType = tile.smartType!;
          let sheetUrl: string | null = null;
          if (smartType === 'water' && waterSheetUrl) sheetUrl = waterSheetUrl;
          else if (smartType === 'dirt' && dirtSheetUrl) sheetUrl = dirtSheetUrl;
          else if (autoTileSheetUrl) sheetUrl = autoTileSheetUrl;

          if (!sheetUrl) {
            return (
              <div key={`stamp-${stampIdx}-${tile.x}-${tile.y}-${tile.layer || 0}`}
                className="absolute bg-green-500/30 border border-green-500/50"
                style={{ left: tile.x * TILE_SIZE, top: tile.y * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE, imageRendering: 'pixelated' }}
              />
            );
          }

          const coords = smartType === 'water'
            ? getLiquidTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0)
            : getPixiTextureCoords(tile.bitmask || 0, tile.blockCol || 0, tile.blockRow || 0);
          const { sourceX, sourceY } = coords[0];

          return (
            <div key={`stamp-${stampIdx}-${tile.x}-${tile.y}-${tile.layer || 0}`}
              className="absolute"
              style={{
                left: tile.x * TILE_SIZE,
                top: tile.y * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                backgroundImage: `url(${sheetUrl})`,
                backgroundPosition: `-${sourceX}px -${sourceY}px`,
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
              }}
            />
          );
        }

        const customTile = customTiles.find((ct: any) => normalizeUrl(ct.url) === normalizeUrl(tile.imageUrl));
        if (!customTile) return null;
        
        const displayWidth = customTile.frameWidth || TILE_SIZE;
        const displayHeight = customTile.frameHeight || TILE_SIZE;
        
        return (
          <div key={`stamp-${stampIdx}-${tile.x}-${tile.y}-${tile.layer || 0}`}
            className="absolute"
            style={{
              left: tile.x * TILE_SIZE,
              top: tile.y * TILE_SIZE,
              width: displayWidth,
              height: displayHeight,
              backgroundImage: `url(${customTile.url})`,
              backgroundSize: 'cover',
              imageRendering: 'pixelated'
            }}
          />
        );
      })}
    </div>
  );
});

StampPreview.displayName = 'StampPreview';
