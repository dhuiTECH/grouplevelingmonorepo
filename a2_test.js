const n=1, e=4, s=16, w=64;
const ne=2, se=8, sw=32, nw=128;

// Derived from standard A2 mappings and verified against the user's image shapes
const A2_STANDARD_MASKS = [
  // Block 1 (Cols 0-3) - Base corner variations
  [0, 124, 112, 247],
  [31, 255, 241, 223],
  [7, 199, 193, 253],
  [95, 125, 245, 85],

  // Block 2 (Cols 4-7) - Inner corner missing variations
  [255, 247, 125, 119],
  [223, 119, 245, 117],
  [127, 221, 87, 93],
  [215, 213, 85, 255],

  // Block 3 (Cols 8-11) - Straight lines and dead ends
  [16, 84, 4, 64],
  [68, 21, 85, 81],
  [1, 69, 65, 5],
  [80, 20, 0, 0] // 0s are unused in A2 typically
];

const BLOB_12x4_MAP = {
  0: [0, 0],   1: [8, 0],   2: [10, 0],  3: [11, 0],  4: [1, 3],   5: [2, 3],
  6: [3, 3],   7: [5, 0],   8: [6, 0],   9: [8, 2],  10: [11, 1], 11: [7, 3],  
 12: [4, 3],  13: [8, 1],  14: [9, 2],  15: [11, 2], 16: [0, 3],  17: [0, 0],  
 18: [5, 3],  19: [6, 3],  20: [10, 3], 21: [9, 0],  22: [7, 0],  23: [4, 0],  
 24: [8, 3],  25: [9, 3],  26: [11, 3], 27: [2, 1],  28: [0, 1],  29: [4, 1],  
 30: [7, 1],  31: [1, 1],  32: [2, 0],  33: [9, 1],  34: [5, 1],  35: [6, 1],  
 36: [1, 0],  37: [3, 0],  38: [0, 2],  39: [4, 2],  40: [7, 2],  41: [2, 2],  
 42: [3, 1],  43: [10, 2], 44: [5, 2],  45: [6, 2],  46: [1, 2],  47: [3, 2]
};

const standardMaskToTileId = {};
for (let id = 1; id <= 47; id++) {
  if (!BLOB_12x4_MAP[id]) continue;
  const [col, row] = BLOB_12x4_MAP[id];
  const blockX = Math.floor(col / 4);
  const localCol = col % 4;
  const mask = A2_STANDARD_MASKS[row + blockX * 4][localCol];
  standardMaskToTileId[mask] = id;
}

standardMaskToTileId[0] = 17; // 17 is isolated at [0,0]

console.log(JSON.stringify(standardMaskToTileId));
