import { supabase } from '../supabase';
import { CustomTile, MapState, Tile } from './types';

const CHUNK_SIZE = 16;
/** Shorter than before so saves start sooner after edits, while still batching bursts. */
const CHUNK_DEBOUNCE_MS = 650;
/** Parallel upserts — avoids long serial queues on multi-chunk edits. */
const CHUNK_UPSERT_CONCURRENCY = 5;

let globalSyncPromise: Promise<void> = Promise.resolve();
const pendingChunks = new Set<string>();

let batchTimeout: NodeJS.Timeout | null = null;

function normalizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  return url.split('?')[0];
}

export function buildLibByUrl(customTiles: CustomTile[]): Map<string, CustomTile> {
  const m = new Map<string, CustomTile>();
  for (const ct of customTiles) {
    m.set(normalizeUrl(ct.url), ct);
  }
  return m;
}

/**
 * Serializes one placed tile for map_chunks.tile_data, overlaying spritesheet fields
 * from the tile library so we do not need to mutate every placed tile in memory when
 * only library animation/size metadata changes.
 */
export function serializeTileForChunkPersistence(
  t: Tile,
  libByUrl: Map<string, CustomTile>,
): Record<string, unknown> {
  const { id, ...rest } = t;
  const row: Record<string, unknown> = {
    ...rest,
    block_col: t.blockCol || 0,
    block_row: t.blockRow || 0,
  };
  const lib = libByUrl.get(normalizeUrl(t.imageUrl));
  if (!lib) return row;
  if (lib.isSpritesheet !== undefined) row.isSpritesheet = lib.isSpritesheet;
  if (lib.frameCount !== undefined) row.frameCount = lib.frameCount;
  if (lib.frameWidth !== undefined) {
    row.frameWidth = lib.frameWidth;
    row.frame_width = lib.frameWidth;
  }
  if (lib.frameHeight !== undefined) {
    row.frameHeight = lib.frameHeight;
    row.frame_height = lib.frameHeight;
  }
  if (lib.animationSpeed !== undefined) row.animationSpeed = lib.animationSpeed;
  return row;
}

function groupTilesByChunk(allTiles: Tile[]): Map<string, Tile[]> {
  const m = new Map<string, Tile[]>();
  for (const t of allTiles) {
    if (typeof t.x !== 'number' || typeof t.y !== 'number' || isNaN(t.x) || isNaN(t.y)) {
      continue;
    }
    const key = `${Math.floor(t.x / CHUNK_SIZE)},${Math.floor(t.y / CHUNK_SIZE)}`;
    let arr = m.get(key);
    if (!arr) {
      arr = [];
      m.set(key, arr);
    }
    arr.push(t);
  }
  return m;
}

async function upsertChunkFromIndex(
  chunkKey: string,
  tilesByChunk: Map<string, Tile[]>,
  libByUrl: Map<string, CustomTile>,
): Promise<void> {
  const [cx, cy] = chunkKey.split(',').map(Number);
  const list = tilesByChunk.get(chunkKey) ?? [];
  const chunkTiles = list.map(t => serializeTileForChunkPersistence(t, libByUrl));

  const { error } = await supabase.from('map_chunks').upsert(
    {
      chunk_x: cx,
      chunk_y: cy,
      tile_data: chunkTiles,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chunk_x,chunk_y' },
  );

  if (error) {
    console.error(
      `Failed to sync chunk [${cx}, ${cy}] ERROR DETAILS:`,
      JSON.stringify(error, null, 2),
    );
  }
}

function armChunkFlush(get: () => MapState) {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }

  batchTimeout = setTimeout(() => {
    const chunksToProcess = Array.from(pendingChunks);
    pendingChunks.clear();
    batchTimeout = null;

    if (chunksToProcess.length === 0) return;

    globalSyncPromise = globalSyncPromise
      .then(async () => {
        const state = get();
        const allTiles = state.tiles;
        const libByUrl = buildLibByUrl(state.customTiles);
        const tilesByChunk = groupTilesByChunk(allTiles);

        for (let i = 0; i < chunksToProcess.length; i += CHUNK_UPSERT_CONCURRENCY) {
          const batch = chunksToProcess.slice(i, i + CHUNK_UPSERT_CONCURRENCY);
          await Promise.all(
            batch.map(key => upsertChunkFromIndex(key, tilesByChunk, libByUrl)),
          );
        }
      })
      .catch(err => {
        console.error('Global chunk sync sequence error:', err);
      });
  }, CHUNK_DEBOUNCE_MS);
}

/** Queue many chunks but arm the debounced flush only once (avoids N timer resets). */
export const queueChunkSyncs = (chunkKeys: string[], get: () => MapState) => {
  for (const key of chunkKeys) {
    pendingChunks.add(key);
  }
  if (chunkKeys.length === 0) return;
  armChunkFlush(get);
};

export const triggerChunkSync = (chunkX: number, chunkY: number, get: () => MapState) => {
  queueChunkSyncs([`${chunkX},${chunkY}`], get);
};
