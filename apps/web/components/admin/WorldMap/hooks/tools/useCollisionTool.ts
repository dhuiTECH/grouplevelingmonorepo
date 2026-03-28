// apps/web/components/admin/WorldMap/hooks/tools/useCollisionTool.ts
import { useMapStore, Tile } from '@/lib/store/mapStore';
import { rebuildTileIndexes } from '@/lib/store/tileIndex';

const TILE_SIZE = 48;
const COLLISION_LAYER = -2;
const EDGE_BLOCK_LAYER = -3;
const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

export const useCollisionTool = () => {
  const executeCollision = async (
    gx: number, gy: number, isMove: boolean, forceErase: boolean, 
    drawingModeRef: React.MutableRefObject<'adding' | 'removing' | null>, 
    brushArea: {dx: number, dy: number}[]
  ) => {
    const state = useMapStore.getState();
    const currentCollisionMode = state.collisionMode || 'full';
    
    // Check if ANY tile at this position is non-walkable to determine mode
    if (!isMove) {
      if (forceErase) drawingModeRef.current = 'removing';
      else {
        const indexReady = state.tiles.length === 0 || Object.keys(state.tileIdsByCellKey).length > 0;
        const tileById = new Map(state.tiles.map((t) => [t.id, t]));
        const ids = indexReady ? state.tileIdsByCellKey[`${gx},${gy}`] : undefined;
        const tilesAtPos = ids
          ? ids.map((id) => tileById.get(id)).filter((t): t is Tile => !!t)
          : state.tiles.filter((t) => t.x === gx && t.y === gy);
        drawingModeRef.current = tilesAtPos.some((t) => t.isWalkable === false) ? 'removing' : 'adding';
      }
    }

    let stateChanged = false;
    const undoEntries: any[] = [];
    const touchedChunks = new Set<string>();

    const indexReady = state.tiles.length === 0 || Object.keys(state.tileIdsByCellKey).length > 0;
    const tileById = new Map(state.tiles.map((t) => [t.id, t]));
    const candidateIds = new Set<string>();
    if (indexReady) {
      for (const p of brushArea) {
        const list = state.tileIdsByCellKey[`${gx + p.dx},${gy + p.dy}`];
        if (list) list.forEach((id) => candidateIds.add(id));
      }
    }
    const tilesInBrushArea: Tile[] = indexReady
      ? [...candidateIds].map((id) => tileById.get(id)).filter((t): t is Tile => !!t)
      : state.tiles.filter((t) => brushArea.some((p) => t.x === gx + p.dx && t.y === gy + p.dy));
    
    const tileIdsToRemove = new Set<string>();
    const tilesToUpdate = new Map<string, Partial<any>>(); // id -> changes
    const newTilesToAppend: any[] = [];

    if (currentCollisionMode === 'full') {
      const tilesByPos = new Map<string, any[]>();
      tilesInBrushArea.forEach(t => {
        const key = `${t.x},${t.y}`;
        if (!tilesByPos.has(key)) tilesByPos.set(key, []);
        tilesByPos.get(key)!.push(t);
      });

      for (const {dx, dy} of brushArea) {
        const tx = gx + dx; const ty = gy + dy;
        touchedChunks.add(`${Math.floor(tx / 16)},${Math.floor(ty / 16)}`);
        const tilesAtPos = tilesByPos.get(`${tx},${ty}`) || [];
        const collisionTile = tilesAtPos.find(t => t.layer === COLLISION_LAYER);
        
        if (drawingModeRef.current === 'removing') {
          if (collisionTile) {
            undoEntries.push({ action: 'erase_tile', x: tx, y: ty, layer: COLLISION_LAYER, previousTile: collisionTile });
            tileIdsToRemove.add(collisionTile.id);
            stateChanged = true;
          }
          // Restore walkability to props/ground underneath
          for (const t of tilesAtPos) {
            if (t.layer !== COLLISION_LAYER && t.isWalkable === false) {
              tilesToUpdate.set(t.id, { isWalkable: true });
              stateChanged = true;
            }
          }
        } else if (drawingModeRef.current === 'adding') {
          const alreadyBlocked = tilesAtPos.some(t => t.isWalkable === false && !tilesToUpdate.has(t.id)); // Not strictly accurate with pending updates but good enough
          if (!alreadyBlocked && !collisionTile) {
            undoEntries.push({ action: 'paint', x: tx, y: ty, layer: COLLISION_LAYER, previousTile: null });
            newTilesToAppend.push({
              id: generateId(), x: tx, y: ty, type: 'collision', imageUrl: '',
              isSpritesheet: false, frameCount: 0, frameWidth: TILE_SIZE, frameHeight: TILE_SIZE, animationSpeed: 0,
              layer: COLLISION_LAYER, offsetX: 0, offsetY: 0, isWalkable: false, snapToGrid: true, isAutoFill: false, isAutoTile: false,
              bitmask: 0, elevation: 0, hasFoam: false, foamBitmask: 0, rotation: 0, blockCol: 0, blockRow: 0
            });
            stateChanged = true;
          }
        }
      }
    } else {
      // Edge Mode
      const currentEdgeDirection = state.edgeDirection || 1; 
      const edgeTilesByPos = new Map<string, any>();
      tilesInBrushArea.forEach(t => {
        if ((t.layer || 0) === EDGE_BLOCK_LAYER) {
          edgeTilesByPos.set(`${t.x},${t.y}`, t);
        }
      });

      for (const {dx, dy} of brushArea) {
        const tx = gx + dx; const ty = gy + dy;
        touchedChunks.add(`${Math.floor(tx / 16)},${Math.floor(ty / 16)}`);
        const edgeTile = edgeTilesByPos.get(`${tx},${ty}`);
        const currentBits = edgeTile?.edgeBlocks ?? 0;

        if (drawingModeRef.current === 'removing') {
          const newBits = currentBits & ~currentEdgeDirection;
          if (edgeTile && (currentBits & currentEdgeDirection)) {
            if (newBits === 0) tileIdsToRemove.add(edgeTile.id);
            else tilesToUpdate.set(edgeTile.id, { edgeBlocks: newBits });
            stateChanged = true;
          }
        } else if (drawingModeRef.current === 'adding') {
          const newBits = currentBits | currentEdgeDirection;
          if (newBits !== currentBits) {
            if (edgeTile) tilesToUpdate.set(edgeTile.id, { edgeBlocks: newBits });
            else {
              newTilesToAppend.push({
                id: generateId(), x: tx, y: ty, type: 'edge_block', imageUrl: '',
                layer: EDGE_BLOCK_LAYER, offsetX: 0, offsetY: 0, isWalkable: true, snapToGrid: true, isAutoFill: false, isAutoTile: false, edgeBlocks: newBits
              });
            }
            stateChanged = true;
          }
        }
      }
    }

    if (stateChanged) {
      let finalTiles = state.tiles;
      if (tileIdsToRemove.size > 0 || tilesToUpdate.size > 0) {
        finalTiles = state.tiles.filter(t => !tileIdsToRemove.has(t.id)).map(t => {
          if (tilesToUpdate.has(t.id)) return { ...t, ...tilesToUpdate.get(t.id) };
          return t;
        });
      }
      
      if (newTilesToAppend.length > 0) {
        finalTiles = [...finalTiles, ...newTilesToAppend];
      }

      useMapStore.setState({
        tiles: finalTiles,
        ...rebuildTileIndexes(finalTiles),
        undoStack: [...state.undoStack, ...undoEntries],
      });
      // Ensure collision changes are persisted to Supabase by syncing touched chunks
      useMapStore.getState().syncChunks(Array.from(touchedChunks));
    }
  };

  return { executeCollision };
};
