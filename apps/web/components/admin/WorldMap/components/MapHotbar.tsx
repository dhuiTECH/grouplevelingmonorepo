import React from 'react';
import { useMapStore } from '@/lib/store/mapStore';
import { Plus } from 'lucide-react';

export const MapHotbar = React.memo(() => {
  const favorites = useMapStore(state => state.favorites);
  const setFavorite = useMapStore(state => state.setFavorite);
  const customTiles = useMapStore(state => state.customTiles);
  const selectTile = useMapStore(state => state.selectTile);
  const selectedTileId = useMapStore(state => state.selectedTileId);

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2 p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-2xl shadow-2xl">
      {favorites.map((tileId, idx) => {
        const tile = customTiles.find(t => t.id === tileId);
        return (
          <button
            key={idx}
            onClick={() => tileId && selectTile(tileId)}
            onContextMenu={e => {
              e.preventDefault();
              if (selectedTileId) setFavorite(idx, selectedTileId);
            }}
            className={`w-12 h-12 rounded-xl border-2 flex flex-col items-center justify-center relative transition-all group ${
              tileId
                ? 'bg-slate-800 border-slate-600 hover:border-cyan-400'
                : 'bg-slate-950 border-slate-800 border-dashed hover:border-slate-600'
            }`}
          >
            {tile ? (
              <div
                className="w-8 h-8"
                style={{
                  backgroundImage: `url(${tile.url})`,
                  backgroundSize:
                    tile.isSpritesheet && tile.frameCount
                      ? `${tile.frameCount * 100}% 100%`
                      : 'contain',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  imageRendering: 'pixelated',
                }}
              />
            ) : (
              <span className="text-[10px] text-slate-700 font-bold">
                {idx + 1}
              </span>
            )}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-slate-800 rounded-full border border-slate-600 flex items-center justify-center text-[8px] font-bold text-slate-400">
              {idx + 1}
            </div>
            {!tileId && (
              <Plus
                size={10}
                className="absolute inset-0 m-auto text-slate-800 opacity-0 group-hover:opacity-100"
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

MapHotbar.displayName = 'MapHotbar';

