import { StateCreator } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../supabase';
import { calculateBitmask } from '../../../components/admin/WorldMap/mapUtils';
import { MapState, MapDataSlice, Tile, CustomTile } from '../types';
import {
  triggerChunkSync,
  queueChunkSyncs,
  buildLibByUrl,
  serializeTileForChunkPersistence,
  formatPostgrestError,
} from '../chunkSync';
import { rebuildTileIndexes } from '../tileIndex';

const CHUNK_SIZE = 16;

/** Keeps syncStatus literals typed as the CustomTile union (not `string`) for Zustand set(). */
type CustomTileSyncStatus = NonNullable<CustomTile['syncStatus']>;

export const createMapDataSlice: StateCreator<
  MapState,
  [],
  [],
  MapDataSlice
> = (set, get) => ({
  tiles: [],
  tileIdsByCellKey: {},
  tileIdsByChunkKey: {},
  nodes: [],
  customTiles: [],
  isLoadingTiles: false,
  chunkSaveStatus: 'idle',
  chunkSavePendingChunkCount: 0,
  chunkSaveError: null,
  chunkSaveLastSyncError: null,
  chunkSaveLastSavedAt: null,
  spawnPoint: null,

  setChunkSaveUi: (update) => {
    if (update.status === 'idle') {
      set({ chunkSaveStatus: 'idle', chunkSaveError: null, chunkSaveLastSyncError: null });
      return;
    }
    if (update.status === 'pending') {
      set({
        chunkSaveStatus: 'pending',
        chunkSavePendingChunkCount: update.pendingChunkCount,
        chunkSaveError: null,
        ...(update.lastSyncError !== undefined
          ? { chunkSaveLastSyncError: update.lastSyncError }
          : {}),
      });
      return;
    }
    if (update.status === 'saving') {
      set({
        chunkSaveStatus: 'saving',
        chunkSaveError: null,
        ...(update.lastSyncError !== undefined
          ? { chunkSaveLastSyncError: update.lastSyncError }
          : {}),
      });
      return;
    }
    if (update.status === 'saved') {
      set({
        chunkSaveStatus: 'saved',
        chunkSaveLastSavedAt: update.savedAt,
        chunkSaveError: null,
        chunkSaveLastSyncError: null,
      });
      return;
    }
    set({
      chunkSaveStatus: 'error',
      chunkSaveError: update.error,
      chunkSaveLastSyncError: null,
    });
  },

  setTiles: (tiles) => set({ tiles, ...rebuildTileIndexes(tiles) }),
  setNodes: (nodes) => set({ nodes }),
  setCustomTiles: (customTiles) => set({ customTiles }),

  loadTilesFromSupabase: async () => {
    set({ isLoadingTiles: true });
    
    try {
      // 1. Load Nodes FIRST (they are small and critical)
      const { data: nodesData, error: nodesError } = await supabase.from('world_map_nodes').select('*');
      if (nodesError) {
        console.error('Error loading map nodes:', nodesError);
      } else if (nodesData) {
        set({
          nodes: nodesData.map((n: any) => ({
            id: n.id,
            x: Number(n.global_x ?? n.x ?? 0),
            y: Number(n.global_y ?? n.y ?? 0),
            type: n.type,
            name: n.name,
            iconUrl: n.icon_url,
            properties: n.interaction_data || {}
          }))
        });
      }

      // 2. Load Global Settings
      const { data: settingsData, error: settingsError } = await supabase.from('world_map_settings').select('*').eq('id', 1).maybeSingle();
      if (settingsError) console.error('Error loading map settings:', settingsError);
      
      if (settingsData) {
        set({
          autoTileSheetUrl: settingsData.autotile_sheet_url,
          dirtSheetUrl: settingsData.dirt_sheet_url,
          waterSheetUrl: settingsData.water_sheet_url,
          dirtv2SheetUrl: settingsData.dirtv2_sheet_url,
          waterv2SheetUrl: settingsData.waterv2_sheet_url,
        });
      }

      // 3. Load Custom Tile Library
      const { data: customTilesData, error: customTilesError } = await supabase.from('custom_tiles').select('*').order('sort_order', { ascending: true });
      if (customTilesError) {
        console.error('Error loading custom tiles:', customTilesError);
      } else if (customTilesData) {
        const parsedTiles: CustomTile[] = customTilesData.map((t: any) => ({
          id: t.id,
          url: t.url,
          name: t.name,
          type: t.type,
          isSpritesheet: t.is_spritesheet,
          frameCount: t.frame_count,
          frameWidth: t.frame_width,
          frameHeight: t.frame_height,
          animationSpeed: t.animation_speed,
          layer: t.layer || 0,
          isWalkable: t.is_walk_able ?? t.is_walkable ?? true,
          snapToGrid: t.snap_to_grid ?? false,
          isAutoFill: t.is_autofill ?? true,
          isAutoTile: t.is_autotile ?? false,
          smartType: t.smartType,
          category: t.category,
          rotation: t.rotation || 0,
          sort_order: t.sort_order || 0,
          syncStatus: 'synced' as const
        }));

        let initialWaterBaseId = null;
        let initialFoamStripId = null;
        
        if (settingsData) {
           const matchingWater = parsedTiles.find((t: CustomTile) => t.url === settingsData.water_base_url && t.category === 'water_base');
           if (matchingWater) initialWaterBaseId = matchingWater.id;

           const matchingFoam = parsedTiles.find((t: CustomTile) => t.url === settingsData.foam_sheet_url && t.category === 'foam_strip');
           if (matchingFoam) initialFoamStripId = matchingFoam.id;
        }

        set({
          customTiles: parsedTiles,
          selectedWaterBaseId: initialWaterBaseId,
          selectedFoamStripId: initialFoamStripId
        });
      }

      // 4. Load Chunks (can be huge)
      const { data: chunksData, error: chunksError } = await supabase.from('map_chunks').select('*');
      if (chunksError) {
        console.error('Error loading map chunks ERROR DETAILS:', JSON.stringify(chunksError, null, 2));
      } else if (chunksData) {
        const libByUrl = buildLibByUrl(get().customTiles);
        const allTiles: Tile[] = [];
        chunksData.forEach((chunk: any) => {
          const tileData = chunk.tile_data;
          if (Array.isArray(tileData)) {
            tileData.forEach((t: any) => {
              if (typeof t.x !== 'number' || typeof t.y !== 'number' || isNaN(t.x) || isNaN(t.y)) {
                 return;
              }

              const lib = libByUrl.get((t.imageUrl || '').split('?')[0]);

              allTiles.push({
                id: uuidv4(),
                x: t.x,
                y: t.y,
                imageUrl: t.imageUrl,
                type: t.type,
                isSpritesheet: lib?.isSpritesheet ?? t.isSpritesheet,
                frameCount: lib?.frameCount ?? t.frameCount,
                frameWidth: lib?.frameWidth ?? t.frame_width ?? t.frameWidth,
                frameHeight: lib?.frameHeight ?? t.frame_height ?? t.frameHeight,
                animationSpeed: lib?.animationSpeed ?? t.animationSpeed,
                layer: t.layer || 0,
                offsetX: t.offsetX || 0,
                offsetY: t.offsetY || 0,
                isWalkable: t.isWalkable ?? true,
                snapToGrid: t.snapToGrid ?? false,
                isAutoFill: t.isAutoFill ?? true,
                isAutoTile: t.isAutoTile,
                bitmask: t.bitmask,
                elevation: t.elevation,
                blockCol: t.blockCol ?? t.block_col,
                blockRow: t.blockRow ?? t.block_row,
                hasFoam: t.hasFoam,
                foamBitmask: t.foamBitmask,
                smartType: t.smartType,
                rotation: t.rotation || 0,
                flipX: !!(t.flipX ?? t.flip_x),
                edgeBlocks: t.edgeBlocks,
              });
            });
          }
        });
        set({ tiles: allTiles, ...rebuildTileIndexes(allTiles) });
      }
    } catch (err) {
      console.error('Critical error in loadTilesFromSupabase:', err);
    } finally {
      set({
        isLoadingTiles: false,
        chunkSaveStatus: 'idle',
        chunkSavePendingChunkCount: 0,
        chunkSaveLastSyncError: null,
      });
    }
  },

  addNode: async (node) => {
    const newId = uuidv4();
    set((state) => ({ 
      nodes: [...state.nodes, { ...node, id: newId }] 
    }));
    
    // Fire and forget persistence
    supabase.from('world_map_nodes').insert({
      id: newId,
      // Keep legacy (x, y) in-sync with new global_x/global_y so we don't hit the unique(x,y) constraint.
      global_x: node.x,
      global_y: node.y,
      x: node.x,
      y: node.y,
      type: node.type,
      name: node.name,
      icon_url: node.iconUrl,
      interaction_type: node.type === 'spawn' ? 'CITY' : node.type === 'enemy' ? 'BATTLE' : 'DIALOGUE',
      interaction_data: node.properties || {}
    }).then(({ error }) => {
      if (error) {
        console.error('Failed to persist world_map_node on insert ERROR DETAILS:', JSON.stringify(error, null, 2));
      }
    });
    
    return newId;
  },

  updateNode: async (id, updates) => {
    // 1) Update local state optimistically
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));

    // 2) Read the latest version back from state for persistence
    const updatedNode = get().nodes.find((n) => n.id === id);
    if (!updatedNode) return;

    // Fire and forget persistence
    supabase
      .from('world_map_nodes')
      .update({
        global_x: updatedNode.x,
        global_y: updatedNode.y,
        name: updatedNode.name,
        type: updatedNode.type,
        icon_url: updatedNode.iconUrl,
        interaction_data: updatedNode.properties || {},
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to persist world_map_node on update ERROR DETAILS:', JSON.stringify(error, null, 2));
        }
      });
  },

  removeNode: async (id) => {
    // 1. Fetch node data to get asset URLs before local filter
    const nodeToRemove = get().nodes.find(n => n.id === id);
    
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }));

    const { error } = await supabase.from('world_map_nodes').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete world_map_node ERROR DETAILS:', JSON.stringify(error, null, 2));
      return;
    }

    // 2. Cleanup storage assets if deletion was successful
    if (nodeToRemove) {
      const BUCKET = 'game-assets';
      const props = nodeToRemove.properties || {};
      const scene = props.scene || {};
      const script = (props.dialogue_script || []) as Array<{ image_url?: string; voice_line_url?: string }>;
      const scriptUrls = script.flatMap((line) => [line.image_url, line.voice_line_url].filter(Boolean));

      const assetsToDelete = [
        nodeToRemove.iconUrl,
        props.modal_image_url,
        scene.scene_background_url,
        scene.scene_npc_sprite_url,
        props.speech_sound_url,
        ...scriptUrls
      ].filter(Boolean);

      for (const url of assetsToDelete) {
        try {
          const pathPart = url.split(`/${BUCKET}/`)[1]?.split('?')[0];
          if (pathPart) {
            console.log(`🗑️ Deleting node asset: ${pathPart}`);
            await supabase.storage.from(BUCKET).remove([pathPart]);
          }
        } catch (storageErr) {
          console.error(`Failed to delete storage asset ${url}:`, storageErr);
        }
      }
    }
  },

  addCustomTile: async (tile) => {
    set((state) => ({
      customTiles: [...state.customTiles, { ...tile, syncStatus: 'syncing' as const satisfies CustomTileSyncStatus }]
    }));
    
    // Fire and forget persistence
    supabase.from('custom_tiles').insert({
      id: tile.id,
      name: tile.name,
      url: tile.url,
      type: tile.type,
      layer: tile.layer || 0,
      is_spritesheet: tile.isSpritesheet,
      frame_count: tile.frameCount,
      frame_width: tile.frameWidth,
      frame_height: tile.frameHeight,
      animation_speed: tile.animationSpeed,
      is_walkable: tile.isWalkable ?? true,
      snap_to_grid: tile.snapToGrid ?? false,
      is_autofill: tile.isAutoFill ?? true,
      is_autotile: tile.isAutoTile ?? false,
      smartType: tile.smartType, 
      category: tile.category, 
      rotation: tile.rotation || 0,
      sort_order: tile.sort_order || 0
    }).then(({ error }) => {
      if (error) {
        console.error("Failed to add custom tile ERROR DETAILS:", JSON.stringify(error, null, 2));
        set(state => ({
          customTiles: state.customTiles.map(t => t.id === tile.id ? { ...t, syncStatus: 'error' as const satisfies CustomTileSyncStatus } : t)
        }));
      } else {
        set(state => ({
          customTiles: state.customTiles.map(t => t.id === tile.id ? { ...t, syncStatus: 'synced' as const satisfies CustomTileSyncStatus } : t)
        }));
      }
    });
  },

  batchAddCustomTiles: async (newTiles) => {
    set((state) => ({
      customTiles: [
        ...state.customTiles,
        ...newTiles.map((t): CustomTile => ({ ...t, syncStatus: 'syncing' as const satisfies CustomTileSyncStatus })),
      ]
    }));

    const rows = newTiles.map(tile => ({
      id: tile.id,
      name: tile.name,
      url: tile.url,
      type: tile.type,
      layer: tile.layer || 0,
      is_spritesheet: tile.isSpritesheet,
      frame_count: tile.frameCount,
      frame_width: tile.frameWidth,
      frame_height: tile.frameHeight,
      animation_speed: tile.animationSpeed,
      is_walkable: tile.isWalkable ?? true,
      snap_to_grid: tile.snapToGrid ?? false,
      is_autofill: tile.isAutoFill ?? true,
      is_autotile: tile.isAutoTile ?? false,
      smartType: tile.smartType,
      category: tile.category,
      rotation: tile.rotation || 0,
      sort_order: tile.sort_order || 0
    }));

    supabase.from('custom_tiles').insert(rows).then(({ error }) => {
      const ids = new Set(newTiles.map(t => t.id));
      if (error) {
        console.error("Failed to batch add custom tiles ERROR DETAILS:", JSON.stringify(error, null, 2));
        set(state => ({
          customTiles: state.customTiles.map(t => ids.has(t.id) ? { ...t, syncStatus: 'error' as const satisfies CustomTileSyncStatus } : t)
        }));
      } else {
        set(state => ({
          customTiles: state.customTiles.map(t => ids.has(t.id) ? { ...t, syncStatus: 'synced' as const satisfies CustomTileSyncStatus } : t)
        }));
      }
    });
  },

  removeCustomTile: async (id) => {
    set((state) => ({
      customTiles: state.customTiles.filter(t => t.id !== id),
      selectedTileId: state.selectedTileId === id ? null : state.selectedTileId
    }));
    
    // Fire and forget persistence
    supabase.from('custom_tiles').delete().eq('id', id).then(({ error }) => {
      if (error) {
        console.error("Failed to remove custom tile ERROR DETAILS:", JSON.stringify(error, null, 2));
      }
    });
  },

  updateCustomTile: async (id, updates) => {
    const state = get();
    const oldTile = state.customTiles.find(t => t.id === id);
    if (!oldTile) return;
    const baseTileUrl = oldTile.url.split('?')[0];

    // Optimistically update local state
    set((s) => ({
      customTiles: s.customTiles.map(t =>
        t.id === id ? { ...t, ...updates, syncStatus: 'syncing' as const satisfies CustomTileSyncStatus } : t
      )
    }));

    const structuralPatch: Partial<Tile> = {};
    if (updates.type !== undefined) structuralPatch.type = updates.type as Tile['type'];
    if (updates.layer !== undefined) structuralPatch.layer = updates.layer;
    if (updates.isWalkable !== undefined) structuralPatch.isWalkable = updates.isWalkable;
    if (updates.snapToGrid !== undefined) structuralPatch.snapToGrid = updates.snapToGrid;
    if (updates.isAutoFill !== undefined) structuralPatch.isAutoFill = updates.isAutoFill;
    if (updates.isAutoTile !== undefined) structuralPatch.isAutoTile = updates.isAutoTile;
    if (updates.rotation !== undefined) structuralPatch.rotation = updates.rotation;
    if (updates.smartType !== undefined) structuralPatch.smartType = updates.smartType;

    const hasStructural = Object.keys(structuralPatch).length > 0;
    const hasSpriteMeta =
      updates.isSpritesheet !== undefined ||
      updates.frameCount !== undefined ||
      updates.frameWidth !== undefined ||
      updates.frameHeight !== undefined ||
      updates.animationSpeed !== undefined;

    const needsChunkResync = hasStructural || hasSpriteMeta;

    if (needsChunkResync) {
      const latest = get();
      const hasAnyMatches = latest.tiles.some(t => t.imageUrl?.split('?')[0] === baseTileUrl);

      if (hasAnyMatches) {
        if (hasStructural) {
          set(s => {
            const newTiles = s.tiles.map(t => {
              if (!t.imageUrl || t.imageUrl.split('?')[0] !== baseTileUrl) return t;
              return { ...t, ...structuralPatch };
            });
            return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
          });
        }

        const chunkKeys = new Set<string>();
        for (const t of get().tiles) {
          if (!t.imageUrl) continue;
          if (t.imageUrl.split('?')[0] !== baseTileUrl) continue;
          chunkKeys.add(`${Math.floor(t.x / CHUNK_SIZE)},${Math.floor(t.y / CHUNK_SIZE)}`);
        }
        queueChunkSyncs([...chunkKeys], get);
      }
    }

    // Map updates to snake_case for Supabase
    const dbUpdates: any = {};
    if ('name' in updates) dbUpdates.name = updates.name;
    if ('url' in updates) dbUpdates.url = updates.url;
    if ('type' in updates) dbUpdates.type = updates.type;
    if ('isSpritesheet' in updates) dbUpdates.is_spritesheet = updates.isSpritesheet;
    if ('frameCount' in updates) dbUpdates.frame_count = updates.frameCount;
    if ('frameWidth' in updates) dbUpdates.frame_width = updates.frameWidth;
    if ('frameHeight' in updates) dbUpdates.frame_height = updates.frameHeight;
    if ('animationSpeed' in updates) dbUpdates.animation_speed = updates.animationSpeed;
    if ('layer' in updates) dbUpdates.layer = updates.layer;
    if ('isWalkable' in updates) dbUpdates.is_walkable = updates.isWalkable;
    if ('snapToGrid' in updates) dbUpdates.snap_to_grid = updates.snapToGrid;
    if ('isAutoFill' in updates) dbUpdates.is_autofill = updates.isAutoFill;
    if ('isAutoTile' in updates) dbUpdates.is_autotile = updates.isAutoTile;
    if ('smartType' in updates) dbUpdates.smartType = updates.smartType;
    if ('category' in updates) dbUpdates.category = updates.category;
    if ('rotation' in updates) dbUpdates.rotation = updates.rotation;
    if ('sort_order' in updates) dbUpdates.sort_order = updates.sort_order;

    if (Object.keys(dbUpdates).length > 0) {
      // Fire and forget persistence
      supabase.from('custom_tiles').update(dbUpdates).eq('id', id).then(({ error }) => {
        if (error) {
          console.error("Failed to update custom tile ERROR DETAILS:", JSON.stringify(error, null, 2));
          set(state => ({
            customTiles: state.customTiles.map(t =>
              t.id === id ? { ...t, syncStatus: 'error' as const satisfies CustomTileSyncStatus } : t
            )
          }));
        } else {
          set(state => ({
            customTiles: state.customTiles.map(t =>
              t.id === id ? { ...t, syncStatus: 'synced' as const satisfies CustomTileSyncStatus } : t
            )
          }));
        }
      });
    }
  },

  reorderCustomTiles: async (tiles) => {
    set({ customTiles: tiles });
    
    // Batch update sort order in Supabase
    const updates = tiles.map((t, index) => ({
      id: t.id,
      url: t.url,
      name: t.name,
      sort_order: index
    }));

    // Debounce the Supabase call to avoid lag when dragging quickly
    if ((window as any)._reorderTimeout) {
      clearTimeout((window as any)._reorderTimeout);
    }
    
    (window as any)._reorderTimeout = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      try {
        // Use a single upsert operation instead of N individual updates
        // We include required fields (id, url, name) to satisfy potential constraints, 
        // while updating the sort_order for all tiles in one network request.
        await supabase.from('custom_tiles').upsert(updates, { onConflict: 'id' });
      } catch (e) {
        console.error('Failed to sync reorder', e);
      }
    }, 500);
  },

  setSpawnPoint: (x, y) => set({ spawnPoint: { x, y } }),

  addTile: (tile) =>
    set((state) => {
      const newTiles = [...state.tiles.filter(t => t.x !== tile.x || t.y !== tile.y), tile];
      return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
    }),

  addTileSimple: async (x: number, y: number, type: string, imageUrl: string, isSpritesheet?: boolean, frameCount?: number, frameWidth?: number, frameHeight?: number, animationSpeed?: number, layer?: number, offsetX?: number, offsetY?: number, isWalkable?: boolean, snapToGrid?: boolean, isAutoFill?: boolean, isAutoTile?: boolean, bitmask?: number, elevation?: number, hasFoam?: boolean, foamBitmask?: number, smartType?: string, rotation?: number, blockCol?: number, blockRow?: number, edgeBlocks?: number, flipX?: boolean) => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    // 1. Update local state (keep full data for instant web rendering)
    set((state) => {
      // Build a fast O(1) index keyed by "x,y,layer" for snapped lookups
      const cellKey = `${x},${y},${layer || 0}`;
      const snappedIndex = new Map<string, number>();
      state.tiles.forEach((t, i) => {
        snappedIndex.set(`${t.x},${t.y},${t.layer || 0}`, i);
      });

      // Logic for finding "same" tile to replace:
      // - If snapped: same x, y, layer — use O(1) map lookup
      // - If non-snapped: same x, y, layer AND offset is very close (within 8px)
      let existingIdx = -1;
      if (snapToGrid !== false) {
        // Either this tile or the candidate is snapped — one tile per cell per layer
        existingIdx = snappedIndex.get(cellKey) ?? -1;
      } else {
        // Both are free-positioned — scan only the small subset at this cell (usually 0–3 tiles)
        const atCell = state.tiles
          .map((t, i) => ({ t, i }))
          .filter(({ t }) => t.x === x && t.y === y && (t.layer || 0) === (layer || 0));
        const match = atCell.find(({ t }) =>
          t.snapToGrid === false &&
          Math.abs((t.offsetX || 0) - (offsetX || 0)) < 2 &&
          Math.abs((t.offsetY || 0) - (offsetY || 0)) < 2
        );
        if (match) existingIdx = match.i;
      }

      const newTile = {
        id: uuidv4(),
        x, y, type, imageUrl, isSpritesheet, frameCount, frameWidth, frameHeight, animationSpeed,
        layer: layer || 0, offsetX: offsetX || 0, offsetY: offsetY || 0,
        isWalkable: isWalkable ?? true, snapToGrid: snapToGrid ?? false, isAutoFill: isAutoFill ?? true,
        isAutoTile, bitmask, elevation, hasFoam, foamBitmask, smartType,
        blockCol: blockCol || 0, blockRow: blockRow || 0, rotation: rotation || 0,
        ...(edgeBlocks !== undefined ? { edgeBlocks } : {}),
        ...(flipX ? { flipX: true } : {}),
      };

      if (existingIdx !== -1) {
        const newTiles = [...state.tiles];
        newTiles[existingIdx] = newTile;
        return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
      }
      const newTiles = [...state.tiles, newTile];
      return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
    });

    // 2. Debounced sync to Supabase
    triggerChunkSync(chunkX, chunkY, get);

    // Trigger Autotile Update ONLY if this specific tile is marked as an autotile.
    // get().isSmartMode is used for the paintbrush to know when to SET isAutoTile=true,
    // but once it's passed here, we should respect the tile's own property.
    if (isAutoTile) {
      await get().updateTileAndNeighbors(x, y, layer || 0, false, smartType, blockCol, blockRow);
    }
  },

  batchAddTiles: async (newTiles) => {
    // Group tiles by chunk
    const chunkKeys = new Set<string>();
    newTiles.forEach(tile => {
      const cx = Math.floor(tile.x / CHUNK_SIZE);
      const cy = Math.floor(tile.y / CHUNK_SIZE);
      chunkKeys.add(`${cx},${cy}`);
    });

    // 1. Update local state with full data
    set((state) => {
      const newTilesKeySet = new Set<string>();
      const processedNewTiles = newTiles.map(nt => {
        const key = `${nt.x},${nt.y},${nt.layer || 0},${nt.offsetX || 0},${nt.offsetY || 0}`;
        newTilesKeySet.add(key);
        return { ...nt, id: uuidv4() } as Tile;
      });

      const filteredExisting = state.tiles.filter(t => {
        const key = `${t.x},${t.y},${t.layer || 0},${t.offsetX || 0},${t.offsetY || 0}`;
        return !newTilesKeySet.has(key);
      });

      const merged = [...filteredExisting, ...processedNewTiles];
      return { tiles: merged, ...rebuildTileIndexes(merged) };
    });

    // 2. Trigger debounced sync for all affected chunks
    Array.from(chunkKeys).forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      triggerChunkSync(cx, cy, get);
    });
  },

  removeTileAt: async (x, y, excludeAutoTiles = false) => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    let removedTile: Tile | null = null;
    let targetLayer: number | undefined;

    // Remove the tile closest to the mouse or the highest layer first
    let existingTilesAtPos = get().tiles.filter(t => t.x === x && t.y === y);
    
    if (excludeAutoTiles) {
      existingTilesAtPos = existingTilesAtPos.filter(t => !t.isAutoTile);
    }
    
    if (existingTilesAtPos.length > 0) {
      // Sort by layer (desc) and then by proximity to the center if multiple tiles on same layer?
      // For now, layer desc is the main rule.
      existingTilesAtPos.sort((a, b) => (b.layer || 0) - (a.layer || 0));
      removedTile = existingTilesAtPos[0];
      targetLayer = removedTile.layer || 0;
      // If there are multiple tiles on this layer (due to non-snap), we should technically pick the one closest to the mouse.
      // But for simplicity, we'll just pick the last added (which is what existing logic does).
    } else {
      return null; // Nothing to remove
    }

    set((state) => {
      const newTiles = state.tiles.filter(t => t.id !== removedTile!.id);
      return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
    });

    // Debounced sync to Supabase
    triggerChunkSync(chunkX, chunkY, get);

    return removedTile;
  },

  removeTileById: async (id, excludeAutoTiles = false) => {
    const tile = get().tiles.find(t => t.id === id);
    if (!tile) return;

    // Respect smart brush lock - don't erase auto tiles if lock is enabled
    if (excludeAutoTiles && tile.isAutoTile) {
      return;
    }

    const { x, y } = tile;
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    set((state) => {
      const newTiles = state.tiles.filter(t => t.id !== id);
      return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
    });

    // Debounced sync to Supabase
    triggerChunkSync(chunkX, chunkY, get);
  },

  moveTile: async (tileId, newX, newY, newOffsetX, newOffsetY) => {
    const tile = get().tiles.find(t => t.id === tileId);
    if (!tile) return;

    const oldX = tile.x;
    const oldY = tile.y;

    // 1. Update local state
    set((state) => {
      const newTiles = state.tiles.map(t =>
        t.id === tileId
          ? { ...t, x: newX, y: newY, offsetX: newOffsetX, offsetY: newOffsetY }
          : t,
      );
      return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
    });

    // Sync to Supabase: handle potentially moving across chunks
    const oldChunkX = Math.floor(oldX / CHUNK_SIZE);
    const oldChunkY = Math.floor(oldY / CHUNK_SIZE);
    const newChunkX = Math.floor(newX / CHUNK_SIZE);
    const newChunkY = Math.floor(newY / CHUNK_SIZE);

    triggerChunkSync(oldChunkX, oldChunkY, get);
    if (oldChunkX !== newChunkX || oldChunkY !== newChunkY) {
      triggerChunkSync(newChunkX, newChunkY, get);
    }
  },

  rotateTile: async (tileId, rotationDelta) => {
    const tile = get().tiles.find(t => t.id === tileId);
    if (!tile) return;

    const currentRotation = tile.rotation || 0;
    const newRotation = (currentRotation + rotationDelta) % 360;
    const normalizedRotation = newRotation < 0 ? newRotation + 360 : newRotation;

    // Update local state
    set((state) => ({
      tiles: state.tiles.map(t => t.id === tileId ? { ...t, rotation: normalizedRotation } : t)
    }));

    // Sync to Supabase
    const chunkX = Math.floor(tile.x / CHUNK_SIZE);
    const chunkY = Math.floor(tile.y / CHUNK_SIZE);
    triggerChunkSync(chunkX, chunkY, get);
  },

  flipTile: async (tileId) => {
    const tile = get().tiles.find(t => t.id === tileId);
    if (!tile) return;

    const isFrozenSmart = !tile.isAutoTile && !!tile.smartType && tile.bitmask !== undefined;
    if (tile.isAutoTile || isFrozenSmart) return;

    const nextFlip = !tile.flipX;

    set((state) => ({
      tiles: state.tiles.map(t => (t.id === tileId ? { ...t, flipX: nextFlip } : t)),
    }));

    const chunkX = Math.floor(tile.x / CHUNK_SIZE);
    const chunkY = Math.floor(tile.y / CHUNK_SIZE);
    triggerChunkSync(chunkX, chunkY, get);
  },

  replaceCustomTileAsset: async (id, newUrl) => {
    const state = get();
    const oldTile = state.customTiles.find(t => t.id === id);
    if (!oldTile) return;

    const oldUrl = oldTile.url;
    // Calculate the base URL once outside the loop to strip cache-busting parameters
    const baseOldUrl = oldUrl.split('?')[0];

    // 1. Update Custom Tile Library locally
    set((state) => ({
      customTiles: state.customTiles.map(t => t.id === id ? { ...t, url: newUrl } : t)
    }));

    // 2. Update all placed tiles that use this asset locally
    const touchedChunks = new Set<string>();
    set((state) => {
      let hasChanges = false;
      const newTiles = state.tiles.map(t => {
        if (!t.imageUrl) return t;
        
        // Strip cache-busting parameters for comparison
        const baseTileUrl = t.imageUrl.split('?')[0];
        
        if (baseTileUrl === baseOldUrl) {
          hasChanges = true;
          touchedChunks.add(`${Math.floor(t.x / CHUNK_SIZE)},${Math.floor(t.y / CHUNK_SIZE)}`);
          return { ...t, imageUrl: newUrl };
        }
        return t;
      });
      if (!hasChanges) return state;
      return { tiles: newTiles, ...rebuildTileIndexes(newTiles) };
    });

    // 3. Trigger debounced sync for touched chunks
    touchedChunks.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      triggerChunkSync(cx, cy, get);
    });
    
    // 4. Update Database
    await supabase.from('custom_tiles').update({ url: newUrl }).eq('id', id);
  },

  forceSyncAllChunks: async () => {
    get().setChunkSaveUi({ status: 'saving' });
    const allTiles = get().tiles;
    const libByUrl = buildLibByUrl(get().customTiles);
    const chunks = new Map<string, Tile[]>();

    allTiles.forEach(t => {
      const cx = Math.floor(t.x / CHUNK_SIZE);
      const cy = Math.floor(t.y / CHUNK_SIZE);
      const key = `${cx},${cy}`;
      if (!chunks.has(key)) chunks.set(key, []);
      chunks.get(key)!.push(t);
    });

    const entries = Array.from(chunks.entries());
    let hadError = false;
    let firstErrorDetail: string | null = null;
    for (const [key, tiles] of entries) {
      const [cx, cy] = key.split(',').map(Number);
      const chunkTiles = tiles.map(t => serializeTileForChunkPersistence(t, libByUrl));

      const { error } = await supabase.from('map_chunks').upsert({
        chunk_x: cx,
        chunk_y: cy,
        tile_data: chunkTiles,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });

      if (error) {
        hadError = true;
        if (!firstErrorDetail) firstErrorDetail = formatPostgrestError(error);
        console.error(`Failed to force sync chunk [${cx}, ${cy}] ERROR DETAILS:`, JSON.stringify(error, null, 2));
      }
    }

    if (entries.length === 0) {
      get().setChunkSaveUi({ status: 'saved', savedAt: Date.now() });
      return;
    }

    if (hadError) {
      get().setChunkSaveUi({
        status: 'error',
        error: firstErrorDetail
          ? `Force save failed: ${firstErrorDetail}`
          : 'One or more map regions failed to save. Check the console for details.',
      });
    } else {
      get().setChunkSaveUi({ status: 'saved', savedAt: Date.now() });
    }
  },

  syncChunks: (chunkKeys: string[]) => {
    const uniqueKeys = [...new Set(chunkKeys)];
    queueChunkSyncs(uniqueKeys, get);
  },

  exportMap: () => {
    const state = get();
    return JSON.stringify({
      version: '1.1.0',
      tiles: state.tiles,
      nodes: state.nodes,
      spawnPoint: state.spawnPoint
    }, null, 2);
  },

  updateTileAndNeighbors: async (x, y, layer, isRemoving = false, smartType?: string, blockCol?: number, blockRow?: number) => {
    // 1. We must recalculate the bitmasks on the state directly.
    const touchedChunks = new Set<string>();

    set((state) => {
      const { tiles } = state;

      const newTiles = [...tiles];

      // Build O(1) index once — used for both localTiles population and updateSingleTile lookups
      const tileIndexMap = new Map<string, number>();
      newTiles.forEach((t, i) => tileIndexMap.set(`${t.x},${t.y},${t.layer || 0}`, i));

      // Pre-calculate a spatial map for fast neighbor lookups using the index (no O(N) scans)
      const localTiles = new Map<string, Tile>();
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const tx = x + dx;
          const ty = y + dy;
          const idx = tileIndexMap.get(`${tx},${ty},${layer}`);
          if (idx !== undefined) localTiles.set(`${tx},${ty}`, newTiles[idx]);
        }
      }

      const getTileSig = (tx: number, ty: number) => {
        const t = localTiles.get(`${tx},${ty}`);
        // Return signature for any tile that has smart properties, even if isAutoTile is false.
        // This allows active smart tiles to connect to "dumb" pasted tiles of the same type.
        return t && t.smartType ? `${t.smartType}-${t.blockCol || 0}-${t.blockRow || 0}` : null;
      };

      const updateSingleTile = (tx: number, ty: number) => {
        const tileIndex = tileIndexMap.get(`${tx},${ty},${layer}`) ?? -1;
        if (tileIndex === -1) return;
        const tile = newTiles[tileIndex];
        
        // CRITICAL: If this tile was manually pasted (isAutoTile = false), do NOT recalculate its bitmask!
        if (!tile.isAutoTile) return;

        // CRITICAL: Only update tiles matching the target smartType/blockCol/blockRow
        // This prevents grass from updating water tiles or different grass blocks
        if (smartType !== undefined && tile.smartType !== smartType) return;
        if (blockCol !== undefined && tile.blockCol !== blockCol) return;
        if (blockRow !== undefined && tile.blockRow !== blockRow) return;

        const mySig = `${tile.smartType}-${tile.blockCol}-${tile.blockRow}`;
        const grid: Record<string, string> = {};

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighborSig = getTileSig(tx + dx, ty + dy);
            if (neighborSig) grid[`${tx+dx},${ty+dy}`] = neighborSig;
          }
        }

        const newMask = calculateBitmask(tx, ty, grid, mySig);
        if (tile.bitmask !== newMask) {
          newTiles[tileIndex] = { ...tile, bitmask: newMask };
          // Update local map too so next neighbor sees the change
          localTiles.set(`${tx},${ty}`, newTiles[tileIndex]);
          touchedChunks.add(`${Math.floor(tx / CHUNK_SIZE)},${Math.floor(ty / CHUNK_SIZE)}`);
        }
      };

      // Update center and then neighbors
      const area = [
        {tx: x, ty: y},
        {tx: x, ty: y-1}, {tx: x+1, ty: y-1}, {tx: x+1, ty: y}, {tx: x+1, ty: y+1},
        {tx: x, ty: y+1}, {tx: x-1, ty: y+1}, {tx: x-1, ty: y}, {tx: x-1, ty: y-1}
      ];

      // If we are REMOVING a tile, we must process the neighbors, but skip the center since it's gone
      for (const pos of area) {
        if (isRemoving && pos.tx === x && pos.ty === y) continue;
        updateSingleTile(pos.tx, pos.ty);
      }

      return { tiles: newTiles };
    });

    // 2. Trigger debounced sync for touched chunks
    touchedChunks.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      triggerChunkSync(cx, cy, get);
    });
  },

  batchUpdateTileAndNeighbors: async (updates) => {
    const touchedChunks = new Set<string>();

    set((state) => {
      const newTiles = [...state.tiles];
      const tileIndexMap = new Map<string, number>();
      newTiles.forEach((t, i) => tileIndexMap.set(`${t.x},${t.y},${t.layer || 0}`, i));

      const localTiles = new Map<string, Tile>();
      
      const getTileSig = (tx: number, ty: number, layer: number) => {
        const key = `${tx},${ty},${layer}`;
        const t = localTiles.get(key) || (tileIndexMap.has(key) ? newTiles[tileIndexMap.get(key)!] : null);
        return t && t.smartType ? `${t.smartType}-${t.blockCol || 0}-${t.blockRow || 0}` : null;
      };

      const updateSingleTile = (tx: number, ty: number, layer: number, smartType?: string, blockCol?: number, blockRow?: number) => {
        const key = `${tx},${ty},${layer}`;
        const tileIndex = tileIndexMap.get(key) ?? -1;
        if (tileIndex === -1) return;
        const tile = newTiles[tileIndex];
        
        if (!tile.isAutoTile) return;
        if (smartType !== undefined && tile.smartType !== smartType) return;
        if (blockCol !== undefined && tile.blockCol !== blockCol) return;
        if (blockRow !== undefined && tile.blockRow !== blockRow) return;

        const mySig = `${tile.smartType}-${tile.blockCol}-${tile.blockRow}`;
        const grid: Record<string, string> = {};

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighborSig = getTileSig(tx + dx, ty + dy, layer);
            if (neighborSig) grid[`${tx+dx},${ty+dy}`] = neighborSig;
          }
        }

        const newMask = calculateBitmask(tx, ty, grid, mySig);
        if (tile.bitmask !== newMask) {
          newTiles[tileIndex] = { ...tile, bitmask: newMask };
          localTiles.set(key, newTiles[tileIndex]);
          touchedChunks.add(`${Math.floor(tx / CHUNK_SIZE)},${Math.floor(ty / CHUNK_SIZE)}`);
        }
      };

      for (const update of updates) {
        const { x, y, layer, isRemoving, smartType, blockCol, blockRow } = update;
        const area = [
          {tx: x, ty: y},
          {tx: x, ty: y-1}, {tx: x+1, ty: y-1}, {tx: x+1, ty: y}, {tx: x+1, ty: y+1},
          {tx: x, ty: y+1}, {tx: x-1, ty: y+1}, {tx: x-1, ty: y}, {tx: x-1, ty: y-1}
        ];
        for (const pos of area) {
          if (isRemoving && pos.tx === x && pos.ty === y) continue;
          updateSingleTile(pos.tx, pos.ty, layer, smartType, blockCol, blockRow);
        }
      }

      return { tiles: newTiles };
    });

    touchedChunks.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      triggerChunkSync(cx, cy, get);
    });
  },

  paintTiles: async (newTiles, tileIdsToRemove, undoEntry, touchedChunks, autoTileQueue, nodeIdsToRemove = []) => {
    // Perform EVERYTHING in one single 'set' call to avoid double renders and lag
    set((state) => {
      let currentTiles = [...state.tiles];
      
      // 1. Remove tiles
      if (tileIdsToRemove.length > 0) {
        const toRemove = new Set(tileIdsToRemove);
        currentTiles = currentTiles.filter(t => !toRemove.has(t.id));
      }
      
      // 2. Add new tiles
      currentTiles = [...currentTiles, ...newTiles];
      
      // 3. Handle AutoTile Bitmasking (Calculated against the NEW combined state)
      if (autoTileQueue.length > 0) {
        const tileIndexMap = new Map<string, number>();
        currentTiles.forEach((t, i) => tileIndexMap.set(`${t.x},${t.y},${t.layer || 0}`, i));

        const getTileSig = (tx: number, ty: number, layer: number) => {
          const idx = tileIndexMap.get(`${tx},${ty},${layer}`);
          const t = idx !== undefined ? currentTiles[idx] : null;
          return t && t.smartType ? `${t.smartType}-${t.blockCol || 0}-${t.blockRow || 0}` : null;
        };

        const updateSingleTile = (tx: number, ty: number, layer: number, smartType?: string, blockCol?: number, blockRow?: number) => {
          const tileIndex = tileIndexMap.get(`${tx},${ty},${layer}`) ?? -1;
          if (tileIndex === -1) return;
          const tile = currentTiles[tileIndex];
          
          if (!tile.isAutoTile) return;
          if (smartType !== undefined && tile.smartType !== smartType) return;
          if (blockCol !== undefined && tile.blockCol !== blockCol) return;
          if (blockRow !== undefined && tile.blockRow !== blockRow) return;

          const mySig = `${tile.smartType}-${tile.blockCol}-${tile.blockRow}`;
          const grid: Record<string, string> = {};

          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const neighborSig = getTileSig(tx + dx, ty + dy, layer);
              if (neighborSig) grid[`${tx+dx},${ty+dy}`] = neighborSig;
            }
          }

          const newMask = calculateBitmask(tx, ty, grid, mySig);
          if (tile.bitmask !== newMask) {
            currentTiles[tileIndex] = { ...tile, bitmask: newMask };
          }
        };

        for (const update of autoTileQueue) {
          const { x, y, layer, isRemoving, smartType, blockCol, blockRow } = update;
          const area = [
            {tx: x, ty: y},
            {tx: x, ty: y-1}, {tx: x+1, ty: y-1}, {tx: x+1, ty: y}, {tx: x+1, ty: y+1},
            {tx: x, ty: y+1}, {tx: x-1, ty: y+1}, {tx: x-1, ty: y}, {tx: x-1, ty: y-1}
          ];
          for (const pos of area) {
            if (isRemoving && pos.tx === x && pos.ty === y) continue;
            updateSingleTile(pos.tx, pos.ty, layer, smartType, blockCol, blockRow);
          }
        }
      }
      
      // 4. Handle Node Removal
      let currentNodes = state.nodes;
      if (nodeIdsToRemove.length > 0) {
        const nodesToRemoveSet = new Set(nodeIdsToRemove);
        currentNodes = currentNodes.filter(n => !nodesToRemoveSet.has(n.id));
      }

      return {
        tiles: currentTiles,
        ...rebuildTileIndexes(currentTiles),
        nodes: currentNodes,
        undoStack: undoEntry ? [...state.undoStack, undoEntry] : state.undoStack,
      };
    });

    // Sync affected chunks to Supabase
    touchedChunks.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      triggerChunkSync(cx, cy, get);
    });
  }
});
