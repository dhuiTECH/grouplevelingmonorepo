import { useMapStore } from '@/lib/store/mapStore';

export const useAutoTiling = () => {
  const { addTileSimple, isFoamEnabled } = useMapStore();

  const calculateAndUpdateTile = async (
    tx: number,
    ty: number,
    layer: number = 0,
    targetSmartType?: string,
    targetBlockCol?: number,
    targetBlockRow?: number
  ) => {
    const currentTiles = useMapStore.getState().tiles;
    const tile = currentTiles.find(t => t.x === tx && t.y === ty && (t.layer || 0) === (layer || 0));

    if (!tile || !tile.isAutoTile) return;

    // If target specs provided, only update tiles matching those specs
    if (targetSmartType !== undefined && tile.smartType !== targetSmartType) return;
    if (targetBlockCol !== undefined && tile.blockCol !== targetBlockCol) return;
    if (targetBlockRow !== undefined && tile.blockRow !== targetBlockRow) return;

    const elevation = tile.elevation || 0;

    const getBitmaskFresh = (x: number, y: number, elev: number) => {
      const has = (dx: number, dy: number) => {
        // FRESH STATE EVERY TIME — this fixes horizontal detection
        const currentTiles = useMapStore.getState().tiles;
        const n = currentTiles.find(t => t.x === x + dx && t.y === y + dy && (t.layer || 0) === (layer || 0));
        // Check smartType, elevation, AND block position (grass blocks don't connect to each other)
        return (
          n?.elevation === elev &&
          n?.smartType === tile.smartType &&
          n?.blockCol === tile.blockCol &&
          n?.blockRow === tile.blockRow
        );
      };
    
      const N = has(0, -1);
      const E = has(1, 0);
      const S = has(0, 1);
      const W = has(-1, 0);
    
      const NE = N && E && has(1, -1);
      const SE = S && E && has(1, 1);
      const SW = S && W && has(-1, 1);
      const NW = N && W && has(-1, -1);
    
      let mask = 0;
      if (N) mask |= 1;
      if (NE) mask |= 2;
      if (E) mask |= 4;
      if (SE) mask |= 8;
      if (S) mask |= 16;
      if (SW) mask |= 32;
      if (W) mask |= 64;
      if (NW) mask |= 128;
    
      // Debug (remove after testing)
      // console.log(`Bitmask @ (${x},${y}): ${mask} (binary: ${mask.toString(2).padStart(8, '0')})`);
    
      return mask;
    };

    const newBitmask = getBitmaskFresh(tx, ty, elevation);
    
    let newFoamBitmask = 0;
    if (useMapStore.getState().isFoamEnabled && elevation === 1) {
       const hasFoam = (dx: number, dy: number) => {
          const n = currentTiles.find(t => t.x === tx + dx && t.y === ty + dy && (t.layer || 0) === 0);
          return (n?.elevation !== 1);
       };

       const N = hasFoam(0, -1);
       const E = hasFoam(1, 0);
       const S = hasFoam(0, 1);
       const W = hasFoam(-1, 0);
       
       const NE = N && E && hasFoam(1, -1);
       const SE = S && E && hasFoam(1, 1);
       const SW = S && W && hasFoam(-1, 1);
       const NW = N && W && hasFoam(-1, -1);

       let fmask = 0;
       if (N) fmask |= 1;
       if (NE) fmask |= 2;
       if (E) fmask |= 4;
       if (SE) fmask |= 8;
       if (S) fmask |= 16;
       if (SW) fmask |= 32;
       if (W) fmask |= 64;
       if (NW) fmask |= 128;
       newFoamBitmask = fmask;
    }

    if (tile.bitmask !== newBitmask || tile.foamBitmask !== newFoamBitmask) {
       useMapStore.setState((state) => ({
         tiles: state.tiles.map(t => 
           t.id === tile.id ? { ...t, bitmask: newBitmask, foamBitmask: newFoamBitmask } : t
         )
       }));

      addTileSimple(
        tx, ty, tile.type, tile.imageUrl, tile.isSpritesheet, 
        tile.frameCount, tile.frameWidth, tile.frameHeight, tile.animationSpeed, 
        tile.layer, tile.offsetX, tile.offsetY, tile.isWalkable, tile.snapToGrid, tile.isAutoFill,
        true, newBitmask, elevation, useMapStore.getState().isFoamEnabled, newFoamBitmask,
        tile.smartType, tile.rotation || 0,
        tile.blockCol, tile.blockRow
      );
    }
  };

  const updateTileAndNeighbors = async (
    tx: number,
    ty: number,
    layer: number = 0,
    isRemoving: boolean = false,
    smartType?: string,
    blockCol?: number,
    blockRow?: number
  ) => {
    // Standard 8-direction update for Winlu A2 Autotiling
    const neighbors = [
      { x: tx, y: ty },     // Center
      { x: tx, y: ty - 1 }, // N
      { x: tx + 1, y: ty }, // E
      { x: tx, y: ty + 1 }, // S
      { x: tx - 1, y: ty }, // W
      { x: tx + 1, y: ty - 1 }, // NE
      { x: tx + 1, y: ty + 1 }, // SE
      { x: tx - 1, y: ty + 1 }, // SW
      { x: tx - 1, y: ty - 1 }  // NW
    ];

    for (const pos of neighbors) {
      if (isRemoving && pos.x === tx && pos.y === ty) continue;

      // ONLY recalculate if the tile actually exists there AND it's an autotile!
      // If it's a manually pasted "dumb" tile (isAutoTile=false), we skip updating its math.
      const existingTile = useMapStore.getState().tiles.find(t => t.x === pos.x && t.y === pos.y && (t.layer || 0) === layer);
      if (existingTile && existingTile.isAutoTile) {
        await calculateAndUpdateTile(pos.x, pos.y, layer, existingTile.smartType, existingTile.blockCol, existingTile.blockRow);
      }
    }
  };

  return { calculateAndUpdateTile, updateTileAndNeighbors };
};
