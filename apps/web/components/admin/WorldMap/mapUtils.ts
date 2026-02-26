export function getA2SubTileCoordinates(bitmask: number, blockCol: number, blockRow: number) {
  const GAP = 48;
  const BLOCK_WIDTH = 576;
  const BLOCK_HEIGHT = 192;
  const TILE_SIZE = 48;

  // 1. Find the starting X/Y of the requested terrain block
  const blockStartX = blockCol * (BLOCK_WIDTH + GAP);
  const blockStartY = blockRow * (BLOCK_HEIGHT + GAP);

  // 2. The 47-Tile Blob Dictionary
  // Maps the 8-bit mask to the {c, r} position on the 12x4 grid inside the block
  const blob47Map: Record<number, { c: number, r: number }> = {
    // --- 0 Connections ---
    0: { c: 0, r: 0 },   // Isolated
    
    // --- 1 Connection (Dead Ends) ---
    1: { c: 0, r: 2 },   // North
    4: { c: 1, r: 0 },   // East
    16: { c: 0, r: 1 },  // South
    64: { c: 2, r: 0 },  // West
    
    // --- 2 Connections (Straights & Corners without diagonals) ---
    17: { c: 0, r: 3 },  // N + S (Vertical pipe)
    68: { c: 3, r: 0 },  // E + W (Horizontal pipe)
    5: { c: 1, r: 2 },   // N + E 
    20: { c: 1, r: 1 },  // E + S 
    80: { c: 2, r: 1 },  // S + W 
    65: { c: 2, r: 2 },  // W + N 
    
    // --- 2 Connections (Corners WITH inner diagonals) ---
    7: { c: 5, r: 0 },   // N + E + NE
    28: { c: 4, r: 0 },  // E + S + SE
    112: { c: 4, r: 1 }, // S + W + SW
    193: { c: 5, r: 1 }, // W + N + NW
    
    // --- 3 Connections (T-Junctions without diagonals) ---
    21: { c: 1, r: 3 },  // N + E + S
    84: { c: 3, r: 1 },  // E + S + W
    81: { c: 2, r: 3 },  // S + W + N
    69: { c: 3, r: 2 },  // W + N + E
    
    // --- 3 Connections (T-Junctions WITH diagonals) ---
    // One diagonal
    23: { c: 9, r: 0 },  // N + E + S (+ NE)
    29: { c: 8, r: 0 },  // N + E + S (+ SE)
    92: { c: 8, r: 1 },  // E + S + W (+ SE)
    116: { c: 7, r: 1 }, // E + S + W (+ SW)
    113: { c: 7, r: 2 }, // S + W + N (+ SW)
    209: { c: 6, r: 2 }, // S + W + N (+ NW)
    71: { c: 6, r: 0 },  // W + N + E (+ NE)
    197: { c: 9, r: 1 }, // W + N + E (+ NW)
    
    // Two diagonals
    31: { c: 8, r: 2 },  // N + E + S (+ NE, SE)
    124: { c: 7, r: 0 }, // E + S + W (+ SE, SW)
    241: { c: 6, r: 1 }, // S + W + N (+ SW, NW)
    199: { c: 9, r: 2 }, // W + N + E (+ NW, NE)
    
    // --- 4 Connections (Crossroads & Centers) ---
    // 0 diagonals (Crossroad)
    85: { c: 3, r: 3 },  // N + E + S + W (No diagonals)
    
    // 1 diagonal
    87: { c: 11, r: 0 }, // + NE
    93: { c: 10, r: 0 }, // + SE
    117: { c: 10, r: 1 },// + SW
    213: { c: 11, r: 1 },// + NW
    
    // 2 diagonals (Adjacent)
    95: { c: 10, r: 2 }, // + NE, SE
    125: { c: 8, r: 3 }, // + SE, SW
    245: { c: 6, r: 3 }, // + SW, NW
    215: { c: 11, r: 2 },// + NW, NE
    
    // 2 diagonals (Opposite)
    119: { c: 4, r: 3 }, // + NE, SW
    221: { c: 5, r: 3 }, // + NW, SE
    
    // 3 diagonals
    127: { c: 10, r: 3 },// Missing NW
    223: { c: 11, r: 3 },// Missing SW
    247: { c: 7, r: 3 }, // Missing SE
    253: { c: 9, r: 3 }, // Missing NE
    
    // 4 diagonals (Full Center Block)
    255: { c: 4, r: 2 }  
  };

  // Fallback to isolated tile if mask somehow misses
  const subTile = blob47Map[bitmask] || blob47Map[0];

  // 3. Calculate final texture atlas coordinates
  const sourceX = blockStartX + (subTile.c * TILE_SIZE);
  const sourceY = blockStartY + (subTile.r * TILE_SIZE);

  return {
    sourceX,
    sourceY,
    sourceWidth: TILE_SIZE,
    sourceHeight: TILE_SIZE
  };
}
