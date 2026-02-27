// apps/web/components/admin/WorldMap/mapUtils.ts
export function getA2SubTileCoordinates(bitmask: number, blockCol: number, blockRow: number) {  // Rename if needed
  const TILE_SIZE = 48;
  const BLOCK_WIDTH = 576;
  const BLOCK_HEIGHT = 192;
  const GAP = 48;
  const strideX = BLOCK_WIDTH + GAP; // 624
  const strideY = BLOCK_HEIGHT + GAP; // 240

  const blockStartX = blockCol * strideX;
  const blockStartY = blockRow * strideY;

  const BLOB_Y_OFFSET = 0; // Starts exactly at the biome corner

  // Standard WinLu/RPG Maker A2 12x4 layout
  const blob47Map = [
    // Rows 0-3, Cols 0-3: The 16 basic tiles
    { mask: 0, col: 0, row: 0 }, { mask: 4, col: 1, row: 0 }, { mask: 64, col: 2, row: 0 }, { mask: 68, col: 3, row: 0 },
    { mask: 1, col: 0, row: 1 }, { mask: 5, col: 1, row: 1 }, { mask: 65, col: 2, row: 1 }, { mask: 69, col: 3, row: 1 },
    { mask: 16, col: 0, row: 2 }, { mask: 20, col: 1, row: 2 }, { mask: 80, col: 2, row: 2 }, { mask: 84, col: 3, row: 2 },
    { mask: 17, col: 0, row: 3 }, { mask: 21, col: 1, row: 3 }, { mask: 81, col: 2, row: 3 }, { mask: 85, col: 3, row: 3 },

    // Rows 0-3, Cols 4-11: The 31 diagonal variations
    { mask: 3, col: 4, row: 0 }, { mask: 9, col: 4, row: 1 }, { mask: 33, col: 4, row: 2 }, { mask: 129, col: 4, row: 3 },
    { mask: 12, col: 5, row: 0 }, { mask: 36, col: 5, row: 1 }, { mask: 132, col: 5, row: 2 }, { mask: 48, col: 5, row: 3 },
    { mask: 144, col: 6, row: 0 }, { mask: 192, col: 6, row: 1 }, { mask: 7, col: 6, row: 2 }, { mask: 11, col: 6, row: 3 },
    { mask: 19, col: 7, row: 0 }, { mask: 35, col: 7, row: 1 }, { mask: 131, col: 7, row: 2 }, { mask: 25, col: 7, row: 3 },
    { mask: 41, col: 8, row: 0 }, { mask: 137, col: 8, row: 1 }, { mask: 67, col: 8, row: 2 }, { mask: 28, col: 8, row: 3 },
    { mask: 44, col: 9, row: 0 }, { mask: 148, col: 9, row: 1 }, { mask: 52, col: 9, row: 2 }, { mask: 176, col: 9, row: 3 },
    { mask: 196, col: 10, row: 0 }, { mask: 29, col: 10, row: 1 }, { mask: 45, col: 10, row: 2 }, { mask: 149, col: 10, row: 3 },
    { mask: 53, col: 11, row: 0 }, { mask: 177, col: 11, row: 1 }, { mask: 197, col: 11, row: 2 }, { mask: 61, col: 11, row: 3 }
  ];

  // Find the matching position for bitmask
  const entry = blob47Map.find(e => e.mask === bitmask) || blob47Map[0];  // fallback to isolated

  return [{
    sourceX: blockStartX + entry.col * TILE_SIZE,
    sourceY: blockStartY + BLOB_Y_OFFSET + entry.row * TILE_SIZE,  // ← Added here
    sourceWidth: TILE_SIZE,
    sourceHeight: TILE_SIZE
  }];
}