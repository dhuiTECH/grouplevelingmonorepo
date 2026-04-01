// apps/mobile/src/components/world-map/mapUtils.ts

import { getAtlasCellFromMask } from '@repo/map-autotile';

export function calculateBitmask(x: number, y: number, grid: Record<string, string>, currentTileId: string): number {
  const isSameType = (nx: number, ny: number) => {
    const neighborTileId = grid[`${nx},${ny}`];
    return neighborTileId === currentTileId;
  };

  const n = isSameType(x, y - 1) ? 1 : 0;
  const e = isSameType(x + 1, y) ? 1 : 0;
  const s = isSameType(x, y + 1) ? 1 : 0;
  const w = isSameType(x - 1, y) ? 1 : 0;

  const ne = n && e && isSameType(x + 1, y - 1) ? 1 : 0;
  const se = s && e && isSameType(x + 1, y + 1) ? 1 : 0;
  const sw = s && w && isSameType(x - 1, y + 1) ? 1 : 0;
  const nw = n && w && isSameType(x - 1, y - 1) ? 1 : 0;

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
  const strideX = BLOCK_WIDTH + GAP;
  const strideY = BLOCK_HEIGHT + GAP;

  const blockStartX = blockCol * strideX;
  const blockStartY = blockRow * strideY;

  const [col, row] = getAtlasCellFromMask(mask);

  return [
    {
      sourceX: blockStartX + col * TILE_SIZE,
      sourceY: blockStartY + row * TILE_SIZE,
      sourceWidth: TILE_SIZE,
      sourceHeight: TILE_SIZE,
    },
  ];
}

export function getLiquidTextureCoords(mask: number, blockCol: number, blockRow: number) {
  const TILE_SIZE = 48;
  const BLOCK_WIDTH = 576;
  const BLOCK_HEIGHT = 192;
  const ROW_GAP = 48;

  const strideX = BLOCK_WIDTH;
  const strideY = BLOCK_HEIGHT + ROW_GAP;

  const blockStartX = blockCol * strideX;
  const blockStartY = blockRow * strideY;

  const [col, row] = getAtlasCellFromMask(mask);

  return [
    {
      sourceX: blockStartX + col * TILE_SIZE,
      sourceY: blockStartY + row * TILE_SIZE,
      sourceWidth: TILE_SIZE,
      sourceHeight: TILE_SIZE,
    },
  ];
}
