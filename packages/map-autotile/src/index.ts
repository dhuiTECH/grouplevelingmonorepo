import { GODOT_MASK_TO_ATLAS_CELL } from './godotTerrainMaskToAtlas';

export { GODOT_MASK_TO_ATLAS_CELL };

function isDev(): boolean {
  const g = globalThis as { __DEV__?: boolean };
  if (typeof g.__DEV__ === 'boolean') return g.__DEV__;
  return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
}

/** Atlas cell [col, row] within the 12×4 biome block for this neighbor bitmask (Godot-authored). */
export function getAtlasCellFromMask(mask: number): [number, number] {
  const cell = GODOT_MASK_TO_ATLAS_CELL[mask];
  if (cell) return cell;
  if (isDev()) {
    console.warn(`[map-autotile] Unknown autotile mask ${mask}; falling back to mask 0 cell`);
  }
  return GODOT_MASK_TO_ATLAS_CELL[0] ?? [0, 0];
}
