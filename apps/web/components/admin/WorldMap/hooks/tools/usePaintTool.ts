// apps/web/components/admin/WorldMap/hooks/tools/usePaintTool.ts
import { useMapStore, Tile } from '@/lib/store/mapStore';

const TILE_SIZE = 48;
const WORLD_SIZE = 100000;
const generateId = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

export const usePaintTool = () => {
  const { batchUpdateTileAndNeighbors } = useMapStore();

  const executePaint = async (gx: number, gy: number, worldX: number, worldY: number, isMove: boolean, isShift: boolean, brushArea: {dx: number, dy: number}[]) => {
    const state = useMapStore.getState();
    const tile = state.customTiles.find(t => t.id === state.selectedTileId);
    
    if (!tile && state.selectedSmartType === 'off') return;

    const activeTileLayer = tile ? tile.layer : state.smartBrushLayer;
    const layerKey = activeTileLayer ?? 0;
    
    // Respect per-layer locking: if this layer is locked, skip all paint ops
    if (state.layerSettings[layerKey]?.locked) return;

    const newTilesToAppend: Tile[] = [];
    const undoEntries: any[] = [];
    const autoTileQueue: any[] = [];
    const touchedChunks = new Set<string>();
    
    // 1. O(N) pass to find existing tiles in the brush area on the target layer
    const brushAreaKeys = new Set(brushArea.map(p => `${gx + p.dx},${gy + p.dy}`));
    const tilesInBrushArea = state.tiles.filter(t => 
       brushAreaKeys.has(`${t.x},${t.y}`) && (t.layer || 0) === layerKey
    );
    
    // Group tiles by position to support multiple tiles per cell in free mode
    const prevTileMap = new Map<string, Tile[]>();
    tilesInBrushArea.forEach(t => {
      const key = `${t.x},${t.y}`;
      if (!prevTileMap.has(key)) prevTileMap.set(key, []);
      prevTileMap.get(key)!.push(t);
    });
    
    const tileIdsToRemove = new Set<string>();

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
      
      if (currentSnapMode === 'free') {
        // In free mode, only replace if we are VERY close to an existing tile on the same layer
        tileToRemove = tilesAtPos.find(t => {
          const dx_off = (t.offsetX || 0) - offsetX;
          const dy_off = (t.offsetY || 0) - offsetY;
          return (dx_off * dx_off + dy_off * dy_off) < 64; // 8px radius threshold
        }) || null;
      } else {
        // In grid/half mode, replace the existing tile in this cell on this layer
        tileToRemove = tilesAtPos[0] || null;
      }

      if (tileToRemove) {
        if (state.smartBrushLock && tileToRemove.isAutoTile) {
          tileToRemove = null; // Locked, don't remove
        } else {
          tileIdsToRemove.add(tileToRemove.id);
        }
      }

      if (!isMove || (dx === 0 && dy === 0)) {
        undoEntries.push({ action: 'paint', x: tx, y: ty, layer: activeTileLayer || 0, previousTile: tileToRemove });
      }

      newTilesToAppend.push({
        id: generateId(),
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
      const remainingTiles = tileIdsToRemove.size > 0 
        ? state.tiles.filter(t => !tileIdsToRemove.has(t.id))
        : state.tiles;

      useMapStore.setState({
        tiles: [...remainingTiles, ...newTilesToAppend],
        undoStack: [...state.undoStack, ...undoEntries]
      });

      // Update smart neighbors and then persist all tile changes to Supabase
      if (autoTileQueue.length > 0) {
        await batchUpdateTileAndNeighbors(autoTileQueue);
      }
      useMapStore.getState().syncChunks(Array.from(touchedChunks));
    }
  };

  const executeErase = async (gx: number, gy: number, isMove: boolean, brushArea: {dx: number, dy: number}[]) => {
    const state = useMapStore.getState();
    let currentNodes = [...state.nodes];
    let stateChanged = false;
    const undoEntries: any[] = [];
    const autoTileQueue: any[] = [];
    const touchedChunks = new Set<string>();

    // 1. O(N) pass to find existing tiles in the brush area
    const brushAreaKeys = new Set(brushArea.map(p => `${gx + p.dx},${gy + p.dy}`));
    const tilesInBrushArea = state.tiles.filter(t => brushAreaKeys.has(`${t.x},${t.y}`));
    
    // Group tiles by position to easily find the topmost one
    const tilesByPos = new Map<string, Tile[]>();
    tilesInBrushArea.forEach(t => {
      const key = `${t.x},${t.y}`;
      if (!tilesByPos.has(key)) tilesByPos.set(key, []);
      tilesByPos.get(key)!.push(t);
    });

    const tileIdsToRemove = new Set<string>();

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

        // Respect per-layer locking: never erase tiles from locked layers
        if (tileToRemove && !state.layerSettings[(tileToRemove.layer || 0)]?.locked) {
          tileIdsToRemove.add(tileToRemove.id);
          stateChanged = true;

          if (!isMove || (dx === 0 && dy === 0)) {
            undoEntries.push({ action: 'erase_tile', x: tx, y: ty, layer: tileToRemove.layer || 0, previousTile: tileToRemove });
          }
          if (tileToRemove.isAutoTile) {
            autoTileQueue.push({ x: tx, y: ty, layer: tileToRemove.layer || 0, isRemoving: true, smartType: tileToRemove.smartType, blockCol: tileToRemove.blockCol, blockRow: tileToRemove.blockRow });
          }
        }
      }

      const nodeIdx = currentNodes.findIndex(node => node.x === tx && node.y === ty);
      if (nodeIdx > -1 && !isMove) {
        undoEntries.push({ action: 'erase_node', nodeData: currentNodes[nodeIdx] });
        currentNodes.splice(nodeIdx, 1);
        stateChanged = true;
      }
    }

    if (stateChanged) {
      const remainingTiles = tileIdsToRemove.size > 0 
        ? state.tiles.filter(t => !tileIdsToRemove.has(t.id))
        : state.tiles;

      useMapStore.setState({ tiles: remainingTiles, nodes: currentNodes, undoStack: [...state.undoStack, ...undoEntries] });

      // Update smart neighbors and then persist all tile changes to Supabase
      if (autoTileQueue.length > 0) {
        await useMapStore.getState().batchUpdateTileAndNeighbors(autoTileQueue);
      }
      useMapStore.getState().syncChunks(Array.from(touchedChunks));
    }
  };

  return { executePaint, executeErase };
};
