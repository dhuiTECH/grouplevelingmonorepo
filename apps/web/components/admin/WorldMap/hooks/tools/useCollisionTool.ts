// apps/web/components/admin/WorldMap/hooks/tools/useCollisionTool.ts
import { useMapStore } from '@/lib/store/mapStore';

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
    const currentCollisionMode = state.collisionMode || 'full'; // 🔥 FIX 1: Fallback if undefined
    
    // 🔥 FIX 2: Check if ANY tile at this position is non-walkable to determine mode
    if (!isMove) {
      if (forceErase) drawingModeRef.current = 'removing';
      else {
        const tilesAtPos = state.tiles.filter(t => t.x === gx && t.y === gy);
        drawingModeRef.current = tilesAtPos.some(t => t.isWalkable === false) ? 'removing' : 'adding';
      }
    }

    let currentTiles = [...state.tiles];
    let stateChanged = false;
    const undoEntries = [];

    if (currentCollisionMode === 'full') {
      for (const {dx, dy} of brushArea) {
        const tx = gx + dx; const ty = gy + dy;
        const tilesAtPos = currentTiles.filter(t => t.x === tx && t.y === ty);
        const collisionTileIdx = currentTiles.findIndex(t => t.x === tx && t.y === ty && t.layer === COLLISION_LAYER);
        
        if (drawingModeRef.current === 'removing') {
          // Remove the red tile
          if (collisionTileIdx > -1) {
            undoEntries.push({ action: 'erase_tile', x: tx, y: ty, layer: COLLISION_LAYER, previousTile: currentTiles[collisionTileIdx] });
            currentTiles.splice(collisionTileIdx, 1);
            stateChanged = true;
          }
          // Restore walkability to props/ground underneath
          for (const t of tilesAtPos) {
            if (t.layer !== COLLISION_LAYER && t.isWalkable === false) {
              const idx = currentTiles.findIndex(ct => ct.id === t.id);
              if (idx > -1) {
                currentTiles[idx] = { ...currentTiles[idx], isWalkable: true };
                stateChanged = true;
              }
            }
          }
        } else if (drawingModeRef.current === 'adding') {
          // Add the red tile only if nothing is already non-walkable here
          const alreadyBlocked = tilesAtPos.some(t => t.isWalkable === false);
          if (!alreadyBlocked && collisionTileIdx === -1) {
            undoEntries.push({ action: 'paint', x: tx, y: ty, layer: COLLISION_LAYER, previousTile: null });
            currentTiles.push({
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
      for (const {dx, dy} of brushArea) {
        const tx = gx + dx; const ty = gy + dy;
        const edgeIdx = currentTiles.findIndex(t => t.x === tx && t.y === ty && (t.layer || 0) === EDGE_BLOCK_LAYER);
        const edgeTile = edgeIdx > -1 ? currentTiles[edgeIdx] : null;
        const currentBits = edgeTile?.edgeBlocks ?? 0;

        if (drawingModeRef.current === 'removing') {
          const newBits = currentBits & ~currentEdgeDirection;
          if (edgeTile && (currentBits & currentEdgeDirection)) {
            if (newBits === 0) currentTiles.splice(edgeIdx, 1);
            else currentTiles[edgeIdx] = { ...currentTiles[edgeIdx], edgeBlocks: newBits };
            stateChanged = true;
          }
        } else if (drawingModeRef.current === 'adding') {
          const newBits = currentBits | currentEdgeDirection;
          if (newBits !== currentBits) {
            if (edgeTile) currentTiles[edgeIdx] = { ...currentTiles[edgeIdx], edgeBlocks: newBits };
            else {
              currentTiles.push({
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
      useMapStore.setState({ tiles: currentTiles, undoStack: [...state.undoStack, ...undoEntries] });
      // Ensure collision changes are persisted to Supabase by forcing a chunk sync
      await useMapStore.getState().forceSyncAllChunks();
    }
  };

  return { executeCollision };
};
