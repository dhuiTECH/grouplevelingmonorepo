import type { Tile } from './types';

/** Matches map_chunks / mapDataSlice chunk grid. */
export const TILE_INDEX_CHUNK_SIZE = 16;

/**
 * Spatial indexes for O(brush cells) and O(visible chunks) tile lookups.
 * Rebuilt whenever the `tiles` array is replaced or mutates in a way that changes membership.
 */
export function rebuildTileIndexes(tiles: Tile[]): {
  tileIdsByCellKey: Record<string, string[]>;
  tileIdsByChunkKey: Record<string, string[]>;
} {
  const tileIdsByCellKey: Record<string, string[]> = {};
  const tileIdsByChunkKey: Record<string, string[]> = {};

  for (const t of tiles) {
    if (typeof t.x !== 'number' || typeof t.y !== 'number' || isNaN(t.x) || isNaN(t.y)) continue;

    const cellKey = `${t.x},${t.y}`;
    if (!tileIdsByCellKey[cellKey]) tileIdsByCellKey[cellKey] = [];
    tileIdsByCellKey[cellKey].push(t.id);

    const cx = Math.floor(t.x / TILE_INDEX_CHUNK_SIZE);
    const cy = Math.floor(t.y / TILE_INDEX_CHUNK_SIZE);
    const chunkKey = `${cx},${cy}`;
    if (!tileIdsByChunkKey[chunkKey]) tileIdsByChunkKey[chunkKey] = [];
    tileIdsByChunkKey[chunkKey].push(t.id);
  }

  return { tileIdsByCellKey, tileIdsByChunkKey };
}
