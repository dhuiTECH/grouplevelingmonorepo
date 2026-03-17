// apps/web/components/admin/WorldMap/hooks/tools/usePaintTool.ts
import { useMapStore, Tile } from '@/lib/store/mapStore';

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;
const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

export const usePaintTool = () => {
  const { paintTiles } = useMapStore();

  const executePaint = async (gx: number, gy: number, worldX: number, worldY: number, isMove: boolean, isShift: boolean, brushArea: {dx: number, dy: number}[]) => {
    const state = useMapStore.getState();
    const tile = state.customTiles.find(t => t.id === state.selectedTileId);
    
    if (!tile && state.selectedSmartType === 'off') return;

    const activeTileLayer = tile ? tile.layer : state.smartBrushLayer;
    const layerKey = activeTileLayer ?? 0;
    
    // Respect per-layer locking
    if (state.layerSettings[layerKey]?.locked) return;

    const newTilesToAppend: Tile[] = [];
    const undoSubActions: any[] = [];
    const autoTileQueue: any[] = [];
    const touchedChunks = new Set<string>();
    
    // 1. Find existing tiles in the brush area on the target layer (Optimized)
    const tilesInBrushArea = state.tiles.filter(t => {
      if ((t.layer || 0) !== layerKey) return false;
      for (let i = 0; i < brushArea.length; i++) {
        if (t.x === gx + brushArea[i].dx && t.y === gy + brushArea[i].dy) return true;
      }
      return false;
    });
    
    const prevTileMap = new Map<string, Tile[]>();
    tilesInBrushArea.forEach(t => {
      const key = `${t.x},${t.y}`;
      if (!prevTileMap.has(key)) prevTileMap.set(key, []);
      prevTileMap.get(key)!.push(t);
    });
    
    const tileIdsToRemove: string[] = [];

    for (const {dx, dy} of brushArea) {
      const tx = gx + dx;
      const ty = gy + dy;
      touchedChunks.add(`${Math.floor(tx / 16)},${Math.floor(ty / 16)}`);
      let offsetX = 0, offsetY = 0;

      const currentSnapMode = state.snapMode;
      if (currentSnapMode === 'free') {
        const exactX = worldX - WORLD_SIZE / 2 + (dx * TILE_SIZE);
        const exactY = worldY - WORLD_SIZE / 2 + (dy * TILE_SIZE);
        offsetX = Math.round(exactX - (tx * TILE_SIZE + TILE_SIZE / 2));
        offsetY = Math.round(exactY - (ty * TILE_SIZE + TILE_SIZE));
      } else if (currentSnapMode === 'half') {
        const HALF = TILE_SIZE / 2;
        const worldRelX = worldX - WORLD_SIZE / 2 + (dx * TILE_SIZE);
        const worldRelY = worldY - WORLD_SIZE / 2 + (dy * TILE_SIZE);
        offsetX = Math.round((Math.round(worldRelX / HALF) * HALF) - (tx * TILE_SIZE + TILE_SIZE / 2));
        offsetY = Math.round((Math.round(worldRelY / HALF) * HALF) - (ty * TILE_SIZE + TILE_SIZE));
      }

      let isAutoTile = tile?.isAutoTile ?? false;
      let elevation = 0, bitmask = 0, hasFoam = state.isFoamEnabled, foamBitmask = 0;
      let smartType = tile?.smartType;

      if (state.selectedSmartType !== 'off' && activeTileLayer === state.smartBrushLayer) {
         isAutoTile = true; smartType = state.selectedSmartType;
         if (state.isRaiseMode) elevation = 1;
         if (isShift) elevation = 0;
      }

      const tilesAtPos = prevTileMap.get(`${tx},${ty}`) || [];
      let tileToRemove: Tile | null = null;
      
      if (currentSnapMode === 'free' && layerKey > 0) {
        // For props/objects in free mode, allow overlapping - NEVER replace automatically
        tileToRemove = null;
      } else if (currentSnapMode === 'free') {
        // For ground tiles in free mode, only replace if we are VERY close
        tileToRemove = tilesAtPos.find(t => {
          const dx_off = (t.offsetX || 0) - offsetX;
          const dy_off = (t.offsetY || 0) - offsetY;
          return (dx_off * dx_off + dy_off * dy_off) < 4; // 2px threshold
        }) || null;
      } else if (currentSnapMode === 'half') {
        // Only replace if they are exactly on the same half-grid snap point!
        tileToRemove = tilesAtPos.find(t => 
          (t.offsetX || 0) === offsetX && (t.offsetY || 0) === offsetY
        ) || null;
      } else {
        tileToRemove = tilesAtPos[0] || null;
      }

      if (tileToRemove) {
        if (state.smartBrushLock && tileToRemove.isAutoTile) {
          tileToRemove = null;
        } else {
          tileIdsToRemove.push(tileToRemove.id);
        }
      }

      const tileId = generateId();

      undoSubActions.push({ 
        action: 'paint', 
        x: tx, 
        y: ty, 
        layer: activeTileLayer || 0, 
        previousTile: tileToRemove,
        addedTileId: tileId
      });

      newTilesToAppend.push({
        id: tileId,
        x: tx, y: ty,
        type: tile?.type || 'custom',
        imageUrl: tile?.url || '',
        isSpritesheet: tile?.isSpritesheet || false,
        frameCount: tile?.frameCount || 0,
        frameWidth: tile?.frameWidth || 48,
        frameHeight: tile?.frameHeight || 48,
        animationSpeed: tile?.animationSpeed || 0.1,
        layer: activeTileLayer || 0,
        offsetX, offsetY,
        isWalkable: tile?.isWalkable ?? true,
        snapToGrid: currentSnapMode === 'full',
        isAutoFill: tile?.isAutoFill ?? false,
        isAutoTile, bitmask, elevation, hasFoam, foamBitmask, smartType,
        rotation: tile?.rotation || 0,
        blockCol: state.selectedBlockCol, blockRow: state.selectedBlockRow
      });

      if (isAutoTile && !state.smartBrushLock) {
        autoTileQueue.push({ x: tx, y: ty, layer: activeTileLayer || 0, isRemoving: false, smartType, blockCol: state.selectedBlockCol, blockRow: state.selectedBlockRow });
      }
    }

    if (newTilesToAppend.length > 0) {
      const finalUndoEntry = undoSubActions.length > 1 
        ? { action: 'batch', subActions: undoSubActions }
        : (undoSubActions[0] || null);

      await paintTiles(newTilesToAppend, tileIdsToRemove, finalUndoEntry, Array.from(touchedChunks), autoTileQueue);
    }
  };

  const executeErase = async (gx: number, gy: number, isMove: boolean, brushArea: {dx: number, dy: number}[]) => {
    const state = useMapStore.getState();
    let currentNodes = [...state.nodes];
    let stateChanged = false;
    const undoSubActions: any[] = [];
    const autoTileQueue: any[] = [];
    const touchedChunks = new Set<string>();

    const tilesInBrushArea = state.tiles.filter(t => {
      for (let i = 0; i < brushArea.length; i++) {
        if (t.x === gx + brushArea[i].dx && t.y === gy + brushArea[i].dy) return true;
      }
      return false;
    });
    
    const tilesByPos = new Map<string, Tile[]>();
    tilesInBrushArea.forEach(t => {
      const key = `${t.x},${t.y}`;
      if (!tilesByPos.has(key)) tilesByPos.set(key, []);
      tilesByPos.get(key)!.push(t);
    });

    const tileIdsToRemove: string[] = [];
    const nodeIdsToRemove: string[] = [];

    for (const {dx, dy} of brushArea) {
      const tx = gx + dx;
      const ty = gy + dy;
      touchedChunks.add(`${Math.floor(tx / 16)},${Math.floor(ty / 16)}`);

      const tilesAtPos = tilesByPos.get(`${tx},${ty}`) || [];
      if (tilesAtPos.length > 0) {
        tilesAtPos.sort((a, b) => (b.layer || 0) - (a.layer || 0));
        let tileToRemove = tilesAtPos[0];
        
        if (state.smartBrushLock && tileToRemove.isAutoTile) {
          tileToRemove = tilesAtPos.find(t => !t.isAutoTile) as any;
        }

        if (tileToRemove && !state.layerSettings[(tileToRemove.layer || 0)]?.locked) {
          tileIdsToRemove.push(tileToRemove.id);
          stateChanged = true;

          undoSubActions.push({ action: 'erase_tile', x: tx, y: ty, layer: tileToRemove.layer || 0, previousTile: tileToRemove });
          
          if (tileToRemove.isAutoTile) {
            autoTileQueue.push({ x: tx, y: ty, layer: tileToRemove.layer || 0, isRemoving: true, smartType: tileToRemove.smartType, blockCol: tileToRemove.blockCol, blockRow: tileToRemove.blockRow });
          }
        }
      }

      const nodeIdx = currentNodes.findIndex(node => node.x === tx && node.y === ty);
      if (nodeIdx > -1 && !isMove) {
        undoSubActions.push({ action: 'erase_node', nodeData: currentNodes[nodeIdx] });
        nodeIdsToRemove.push(currentNodes[nodeIdx].id);
        currentNodes.splice(nodeIdx, 1);
        stateChanged = true;
      }
    }

    if (stateChanged) {
      const finalUndoEntry = undoSubActions.length > 1 
        ? { action: 'batch', subActions: undoSubActions }
        : (undoSubActions[0] || null);

      await paintTiles([], tileIdsToRemove, finalUndoEntry, Array.from(touchedChunks), autoTileQueue, nodeIdsToRemove);
    }
  };

  return { executePaint, executeErase };
};
