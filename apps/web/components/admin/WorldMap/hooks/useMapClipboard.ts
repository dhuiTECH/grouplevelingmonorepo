import { useMapStore } from '@/lib/store/mapStore';
import { supabase } from '@/lib/supabase';

export const useMapClipboard = () => {
  const { undoStack, setUndoStack, addTileSimple, removeTileById, removeNode, addNode, batchAddTiles, tiles } = useMapStore();

  const handleUndo = async () => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    const { action, x, y, layer, previousTile, nodeData, previousFullTiles } = lastAction;

    if (action === 'autofill' && previousFullTiles) {
      useMapStore.setState({ tiles: previousFullTiles });
      
      const chunkCoords = new Set<string>();
      const GRID_RADIUS = 30; 
      for (let x = -GRID_RADIUS; x <= GRID_RADIUS; x++) {
        for (let y = -GRID_RADIUS; y <= GRID_RADIUS; y++) {
          chunkCoords.add(`${Math.floor(x / 16)},${Math.floor(y / 16)}`);
        }
      }

        for (const coord of chunkCoords) {
          const [cx, cy] = coord.split(',').map(Number);
          const chunkTiles = previousFullTiles.filter((t: any) => Math.floor(t.x / 16) === cx && Math.floor(t.y / 16) === cy);
          
          supabase.from('map_chunks').upsert({
            chunk_x: cx,
            chunk_y: cy,
            tile_data: chunkTiles.map((t: any) => {
              const { id, ...rest } = t;
              return rest;
            }),
            updated_at: new Date().toISOString()
          }, { onConflict: 'chunk_x,chunk_y' }).then(({ error }) => {
            if (error) console.error("Error reverting chunk during undo", error);
          });
        }
      
      alert("Autofill undone and synced to database.");
      return;
    }

    if (action === 'paint') {
      if (previousTile) {
        await addTileSimple(
          x, y, previousTile.type, previousTile.imageUrl, 
          previousTile.isSpritesheet, previousTile.frameCount, 
          previousTile.frameWidth, previousTile.frameHeight, 
          previousTile.animationSpeed, previousTile.layer,
          previousTile.offsetX, previousTile.offsetY,
          previousTile.isWalkable,
          previousTile.snapToGrid,
          previousTile.isAutoFill,
          previousTile.isAutoTile,
          previousTile.bitmask,
          previousTile.elevation,
          previousTile.hasFoam,
          previousTile.foamBitmask,
          previousTile.smartType,
          previousTile.rotation || 0
        );
      } else {
        const chunkX = Math.floor(x / 16); 
        const chunkY = Math.floor(y / 16);
        useMapStore.setState((state) => ({
          tiles: state.tiles.filter(t => !(t.x === x && t.y === y && (t.layer || 0) === layer))
        }));
        
        const { data: existingChunk } = await supabase.from('map_chunks').select('tile_data').eq('chunk_x', chunkX).eq('chunk_y', chunkY).maybeSingle();
        if (existingChunk?.tile_data) {
          const newTileData = existingChunk.tile_data.filter((t: any) => !(t.x === x && t.y === y && (t.layer || 0) === layer));
          await supabase.from('map_chunks').upsert({ chunk_x: chunkX, chunk_y: chunkY, tile_data: newTileData, updated_at: new Date().toISOString() }, { onConflict: 'chunk_x,chunk_y' });
        }
      }
    } else if (action === 'erase_tile') {
      if (previousTile) {
        await addTileSimple(
          x, y, previousTile.type, previousTile.imageUrl, 
          previousTile.isSpritesheet, previousTile.frameCount, 
          previousTile.frameWidth, previousTile.frameHeight, 
          previousTile.animationSpeed, previousTile.layer,
          previousTile.offsetX, previousTile.offsetY,
          previousTile.isWalkable,
          previousTile.snapToGrid,
          previousTile.isAutoFill,
          previousTile.isAutoTile,
          previousTile.bitmask,
          previousTile.elevation,
          previousTile.hasFoam,
          previousTile.foamBitmask,
          previousTile.smartType,
          previousTile.rotation || 0
        );
      }
    } else if (action === 'node_add') {
      const n = useMapStore.getState().nodes.find(node => node.x === x && node.y === y);
      if (n) await removeNode(n.id);
    } else if (action === 'erase_node') {
      if (nodeData) {
        await addNode({
          x: nodeData.x,
          y: nodeData.y,
          type: nodeData.type,
          name: nodeData.name,
          iconUrl: nodeData.iconUrl,
          properties: nodeData.properties
        });
      }
    }
  };

  const handleCopySelection = () => {
    const state = useMapStore.getState();
    if (!state.selection) return;

    const startX = Math.min(state.selection.start.x, state.selection.end.x);
    const endX = Math.max(state.selection.start.x, state.selection.end.x);
    const startY = Math.min(state.selection.start.y, state.selection.end.y);
    const endY = Math.max(state.selection.start.y, state.selection.end.y);

    const capturedTiles = state.tiles.filter(t => 
      t.x >= startX && t.x <= endX && t.y >= startY && t.y <= endY
    ).map(t => ({ 
       ...t, 
       x: t.x - startX, 
       y: t.y - startY,
       isAutoTile: false 
    })); 

    state.setCurrentStamp(capturedTiles);
    state.setSelection(null);
  };

  const handlePasteStamp = async (gx: number, gy: number) => {
    const state = useMapStore.getState();
    if (!state.currentStamp) return;

    const newTiles = state.currentStamp.map(t => {
      const { id, ...rest } = t;
      return {
        ...rest,
        x: gx + t.x,
        y: gy + t.y,
        isAutoTile: false
      };
    });

    await state.batchAddTiles(newTiles);
  };

  return { handleUndo, handleCopySelection, handlePasteStamp };
};
