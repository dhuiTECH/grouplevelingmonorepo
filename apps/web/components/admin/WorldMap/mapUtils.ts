// apps/web/components/admin/WorldMap/mapUtils.ts

// The user's exact dictionary for mapping their 1-47 tile IDs to the [col, row] on the 12x4 biome grid.
export const BLOB_12x4_MAP: Record<number, [number, number]> = {
  1: [8, 0],   2: [10, 0],  3: [11, 0],  4: [1, 3],   5: [2, 3],
  6: [3, 3],   7: [5, 0],   8: [6, 0],   9: [8, 2],  10: [11, 1], 11: [7, 3],  
 12: [4, 3],  13: [8, 1],  14: [9, 2],  15: [11, 2], 16: [0, 3],  17: [0, 0],  
 18: [5, 3],  19: [6, 3],  20: [10, 3], 21: [9, 0],  22: [7, 0],  23: [4, 0],  
 24: [8, 3],  25: [9, 3],  26: [11, 3], 27: [2, 1],  28: [0, 1],  29: [4, 1],  
 30: [7, 1],  31: [1, 1],  32: [2, 0],  33: [9, 1],  34: [5, 1],  35: [6, 1],  
 36: [1, 0],  37: [3, 0],  38: [0, 2],  39: [4, 2],  40: [7, 2],  41: [2, 2],  
 42: [3, 1],  43: [10, 2], 44: [5, 2],  45: [6, 2],  46: [1, 2],  47: [3, 2]
};

export const MASK_TO_ID: Record<number, number> = {
  0: 17,    1: 38,    4: 4,     5: 44,    7: 24,    16: 16,   17: 28,   20: 34,
  21: 7,    23: 39,   28: 1,    29: 29,   31: 13,   64: 6,    65: 45,   68: 5,
  69: 19,   71: 42,   80: 35,   81: 8,    84: 18,   85: 27,   87: 22,   92: 32,
  93: 33,   95: 14,   112: 3,   113: 30,  116: 31,  117: 20,  119: 9,   124: 2,
  125: 23,  127: 36,  193: 26,  197: 41,  199: 25,  209: 40,  213: 21,  215: 10,
  221: 12,  223: 46,  241: 15,  245: 43,  247: 11,  253: 37,  255: 47
};

export function getTileIdFromMask(mask: number): number {
  return MASK_TO_ID[mask] ?? 17;
}

export function calculateBitmask(x: number, y: number, grid: Record<string, string>, currentTileId: string): number {
  // Check if a neighbor exists and is of the same type (or connected)
  const isSameType = (nx: number, ny: number) => {
    const neighborTileId = grid[`${nx},${ny}`];
    return neighborTileId === currentTileId;
  };

  const n = isSameType(x, y - 1) ? 1 : 0;
  const e = isSameType(x + 1, y) ? 1 : 0;
  const s = isSameType(x, y + 1) ? 1 : 0;
  const w = isSameType(x - 1, y) ? 1 : 0;

  // For corners, ONLY count them if BOTH adjacent orthogonal edges exist.
  // This is the core rule of standard 8-neighbor bitmasking that reduces 256 to 47.
  const ne = (n && e && isSameType(x + 1, y - 1)) ? 1 : 0;
  const se = (s && e && isSameType(x + 1, y + 1)) ? 1 : 0;
  const sw = (s && w && isSameType(x - 1, y + 1)) ? 1 : 0;
  const nw = (n && w && isSameType(x - 1, y - 1)) ? 1 : 0;

  // N=1, NE=2, E=4, SE=8, S=16, SW=32, W=64, NW=128
  return (
    n * 1 +
    ne * 2 +
    e * 4 +
    se * 8 +
    s * 16 +
    sw * 32 +
    w * 64 +
    nw * 128
  );
}

export function getPixiTextureCoords(mask: number, blockCol: number, blockRow: number) {
  const TILE_SIZE = 48;
  const BLOCK_WIDTH = 576;
  const BLOCK_HEIGHT = 192;
  const GAP = 48;
  const strideX = BLOCK_WIDTH + GAP; // 624
  const strideY = BLOCK_HEIGHT + GAP; // 240

  const blockStartX = blockCol * strideX;
  const blockStartY = blockRow * strideY;

  // 1. Convert standard mask to custom 1-47 ID using the new complete dictionary
  const tileId = getTileIdFromMask(mask);

  // 2. Map custom 1-47 ID to [col, row]
  const [col, row] = BLOB_12x4_MAP[tileId] || [0, 0];

  return [{
    sourceX: blockStartX + col * TILE_SIZE,
    sourceY: blockStartY + row * TILE_SIZE,
    sourceWidth: TILE_SIZE,
    sourceHeight: TILE_SIZE
  }];
}