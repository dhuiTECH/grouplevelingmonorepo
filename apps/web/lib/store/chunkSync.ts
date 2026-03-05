import { supabase } from '../supabase';
import { MapState } from './types';

const CHUNK_SIZE = 16;

export const syncQueue: Record<string, Promise<void> | undefined> = {};
export const syncTimeouts: Record<string, NodeJS.Timeout | undefined> = {};

// Helper to handle debounced chunk syncing
export const triggerChunkSync = (chunkX: number, chunkY: number, get: () => MapState) => {
  const chunkKey = `${chunkX},${chunkY}`;
  
  // Clear existing timeout for this chunk
  if (syncTimeouts[chunkKey]) {
    clearTimeout(syncTimeouts[chunkKey]);
  }

  // Set new timeout (500ms debounce)
  syncTimeouts[chunkKey] = setTimeout(async () => {
    const sync = async () => {
      // Wait for any existing sync for this chunk to finish (serialize requests)
      if (syncQueue[chunkKey]) {
        await syncQueue[chunkKey];
      }

      const allTiles = get().tiles;
      const chunkTiles = allTiles
        .filter(t => Math.floor(t.x / CHUNK_SIZE) === chunkX && Math.floor(t.y / CHUNK_SIZE) === chunkY)
        .map(t => {
          const { id, ...rest } = t;
          return {
            ...rest,
            block_col: t.blockCol || 0,
            block_row: t.blockRow || 0
          };
        });

      await supabase.from('map_chunks').upsert({
        chunk_x: chunkX,
        chunk_y: chunkY,
        tile_data: chunkTiles,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    };

    syncQueue[chunkKey] = sync();
    await syncQueue[chunkKey];
    syncTimeouts[chunkKey] = undefined;
  }, 500);
};
