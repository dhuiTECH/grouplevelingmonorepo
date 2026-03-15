import { supabase } from '../supabase';
import { MapState } from './types';

const CHUNK_SIZE = 16;

// Global sequence to ensure we don't spam Supabase Auth with concurrent requests
let globalSyncPromise: Promise<void> = Promise.resolve();
const pendingChunks = new Set<string>();

// We use a single batching timer rather than one per chunk
let batchTimeout: NodeJS.Timeout | null = null;

// Helper to handle debounced chunk syncing
export const triggerChunkSync = (chunkX: number, chunkY: number, get: () => MapState) => {
  const chunkKey = `${chunkX},${chunkY}`;
  
  // Mark this chunk as needing a sync
  pendingChunks.add(chunkKey);

  // Clear existing global batch timeout
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }

  // Set a single global timeout (1500ms debounce) to wait for the user to finish ALL their edits
  batchTimeout = setTimeout(() => {
    // Take a snapshot of all pending chunks and clear the Set immediately
    const chunksToProcess = Array.from(pendingChunks);
    pendingChunks.clear();

    if (chunksToProcess.length === 0) return;

    // Chain the entire batch processing onto the global promise
    globalSyncPromise = globalSyncPromise.then(async () => {
      // Process each chunk in the snapshot SEQUENTIALLY to prevent Supabase lock timeouts
      for (const key of chunksToProcess) {
        const [cx, cy] = key.split(',').map(Number);
        
        try {
          const allTiles = get().tiles;
          const chunkTiles = allTiles
            .filter(t => Math.floor(t.x / CHUNK_SIZE) === cx && Math.floor(t.y / CHUNK_SIZE) === cy)
            .map(t => {
              const { id, ...rest } = t;
              return {
                ...rest,
                block_col: t.blockCol || 0,
                block_row: t.blockRow || 0
              };
            });

          const { error } = await supabase.from('map_chunks').upsert({
            chunk_x: cx,
            chunk_y: cy,
            tile_data: chunkTiles,
            updated_at: new Date().toISOString()
          }, { onConflict: 'chunk_x,chunk_y' });

          if (error) {
            console.error(`Failed to sync chunk [${cx}, ${cy}] ERROR DETAILS:`, JSON.stringify(error, null, 2));
          }
        } catch (err) {
          console.error(`Unexpected error syncing chunk [${cx}, ${cy}]:`, err);
        }
      }
    }).catch(err => {
      console.error("Global chunk sync sequence error:", err);
    });
  }, 1500); // Wait 1.5 seconds after the LAST edit before we start saving any chunks
};
