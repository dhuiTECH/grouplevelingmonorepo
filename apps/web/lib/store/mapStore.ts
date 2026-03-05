'use client';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';
import { calculateBitmask } from '../../components/admin/WorldMap/mapUtils';

export type NodeType = 'spawn' | 'poi' | 'enemy' | 'npc' | 'loot';

export interface MapNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  name: string;
  iconUrl?: string;
  properties?: Record<string, any>;
}

export interface Tile {
  id: string;
  x: number;
  y: number;
  imageUrl: string;
  type: 'urban' | 'nature' | 'water' | 'grassland' | 'hill' | 'soil' | 'object' | string;
  isSpritesheet?: boolean;
  frameCount?: number;
  frameWidth?: number;
  frameHeight?: number;
  animationSpeed?: number;
  layer?: number; // 0 = ground, 1 = object
  offsetX?: number;
  offsetY?: number;
  isWalkable?: boolean;
  snapToGrid?: boolean;
  isAutoFill?: boolean;
  isAutoTile?: boolean;
  hasFoam?: boolean;
  foamBitmask?: number;
  smartType?: string;
  bitmask?: number;
  elevation?: number;
  blockCol?: number;
  blockRow?: number;
  rotation?: number; // In degrees
  edgeBlocks?: number; // Directional edge collision bitmask: N=1, E=2, S=4, W=8
}

export interface CustomTile {
  id: string;
  url: string;
  name: string;
  type?: 'grassland' | 'water' | 'hill' | 'soil' | 'object' | string;
  isSpritesheet?: boolean;
  frameCount?: number;
  frameWidth?: number;
  frameHeight?: number;
  animationSpeed?: number;
  layer?: number;
  isWalkable?: boolean;
  snapToGrid?: boolean;
  isAutoFill?: boolean;
  isAutoTile?: boolean;
  smartType?: string;
  category?: 'water_base' | 'foam_strip' | 'tile' | 'prop' | 'road' | 'structure' | 'mountain' | 'big_structure';
  rotation?: number; // Default rotation
  sort_order?: number;
}

export type ToolType = 'select' | 'paint' | 'erase' | 'node' | 'stamp' | 'eyedropper' | 'rotate' | 'collision';

const CHUNK_SIZE = 16;

export const useTickStore = create<{ globalTick: number; incrementTick: () => void }>((set) => ({
  globalTick: 0,
  incrementTick: () => set((state) => ({ globalTick: (state.globalTick + 1) % 1000 })),
}));

const syncQueue: Record<string, Promise<void> | undefined> = {};
const syncTimeouts: Record<string, NodeJS.Timeout | undefined> = {};

// Helper to handle debounced chunk syncing
const triggerChunkSync = (chunkX: number, chunkY: number, get: () => MapState) => {
  const chunkKey = `${chunkX},${chunkY}`;
  
  // Clear existing timeout for this chunk
  if (syncTimeouts[chunkKey]) {
    clearTimeout(syncTimeouts[chunkKey]);
  }

  // Set new timeout (500ms debounce)
  syncTimeouts[chunkKey] = setTimeout(async () => {
    const sync = async () => {
      // Wait for any existing sync for this chunk to finish (serialize requests)
      if (syncQueue[chunkKey]) {
        await syncQueue[chunkKey];
      }

      const allTiles = get().tiles;
      const chunkTiles = allTiles
        .filter(t => Math.floor(t.x / CHUNK_SIZE) === chunkX && Math.floor(t.y / CHUNK_SIZE) === chunkY)
        .map(t => {
          const { id, ...rest } = t;
          return {
            ...rest,
            block_col: t.blockCol || 0,
            block_row: t.blockRow || 0
          };
        });

      await supabase.from('map_chunks').upsert({
        chunk_x: chunkX,
        chunk_y: chunkY,
        tile_data: chunkTiles,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    };

    syncQueue[chunkKey] = sync();
    await syncQueue[chunkKey];
    syncTimeouts[chunkKey] = undefined;
  }, 500);
};

export interface LayerSetting {
  locked: boolean;
  hidden: boolean;
}

interface MapState {
  tiles: Tile[];
  nodes: MapNode[];
  customTiles: CustomTile[];
  selectedNodeId: string | null;
  selectedTileId: string | null;
  selectedTool: ToolType;
  activeNodeType: NodeType | null;
  isDraggingNode: boolean;
  draggingNodeId: string | null;
  isDraggingTile: boolean;
  draggingTileId: string | null;
  dragGrabOffset: { x: number, y: number } | null;
  setDragGrabOffset: (offset: { x: number, y: number } | null) => void;
  isLoadingTiles: boolean;
  spawnPoint: { x: number; y: number } | null;
  
  // Brush state
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushMode: boolean;
  setBrushMode: (enabled: boolean) => void;
  snapMode: 'full' | 'half' | 'free';
  setSnapMode: (mode: 'full' | 'half' | 'free') => void;

  // Node state
  nodeSnapToGrid: boolean;
  setNodeSnapToGrid: (enabled: boolean) => void;
  
  // Layout state
  sidebarWidth: number;
  rightSidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;

  // Layer state
  layerSettings: Record<number, LayerSetting>;
  setLayerVisibility: (layer: number, visible: boolean) => void;
  setLayerLocked: (layer: number, locked: boolean) => void;

  // Favorites & Hotbar
  favorites: (string | null)[];
  setFavorite: (index: number, tileId: string | null) => void;

  // Stamps & Selection
  selection: { start: { x: number, y: number }, end: { x: number, y: number } } | null;
  currentStamp: Tile[] | null;
  setSelection: (selection: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => void;
  setCurrentStamp: (stamp: Tile[] | null) => void;

  // Auto-tiling editor state
  isSmartMode: boolean;
  smartBrushLock: boolean;
  selectedSmartType: string;
  selectedBlockCol: number;
  selectedBlockRow: number;
  smartBrushLayer: number;
  terrainOffsets: Record<string, { flat: [number, number], raised: [number, number] }>;
  isRaiseMode: boolean;
  isFoamEnabled: boolean;
  autoTileSheetUrl: string | null;
  dirtSheetUrl: string | null;
  waterSheetUrl: string | null;
  selectedWaterBaseId: string | null;
  selectedFoamStripId: string | null;
  collisionMode: 'full' | 'edge';
  edgeDirection: number;
  setSmartMode: (enabled: boolean) => void;
  setSmartBrushLock: (enabled: boolean) => void;
  setSelectedSmartType: (type: string) => void;
  setSelectedBlock: (col: number, row: number) => void;
  setSmartBrushLayer: (layer: number) => void;
  setRaiseMode: (enabled: boolean) => void;
  setFoamEnabled: (enabled: boolean) => void;
  setCollisionMode: (mode: 'full' | 'edge') => void;
  setEdgeDirection: (direction: number) => void;
  setAutoTileSheetUrl: (url: string | null) => Promise<void>;
  setDirtSheetUrl: (url: string | null) => Promise<void>;
  setWaterSheetUrl: (url: string | null) => Promise<void>;
  setSelectedWaterBaseId: (id: string | null) => Promise<void>; // NEW
  setSelectedFoamStripId: (id: string | null) => Promise<void>; // NEW
  waterBaseTile: () => CustomTile | undefined; // NEW SELECTOR
  foamStripTile: () => CustomTile | undefined; // NEW SELECTOR
  
  // Walkability overlay state
  showWalkabilityOverlay: boolean;
  setShowWalkabilityOverlay: (show: boolean) => void;

  // Debug modal state
  showDebugModal: boolean;
  setShowDebugModal: (show: boolean) => void;
  showDebugNumbers: boolean;
  setShowDebugNumbers: (show: boolean) => void;

  // Undo stack for autofill and other actions
  undoStack: { action: string; x?: number; y?: number; layer?: number; previousTile?: Tile | null; nodeData?: MapNode; previousFullTiles?: Tile[] }[];
  setUndoStack: (updater: (prev: { action: string; x?: number; y?: number; layer?: number; previousTile?: Tile | null; nodeData?: MapNode; previousFullTiles?: Tile[] }[]) => { action: string; x?: number; y?: number; layer?: number; previousTile?: Tile | null; nodeData?: MapNode; previousFullTiles?: Tile[] }[]) => void;
  pushUndo: (action: { action: string; x?: number; y?: number; layer?: number; previousTile?: Tile | null; nodeData?: MapNode; previousFullTiles?: Tile[] }) => void;

  setTiles: (tiles: Tile[]) => void;
  setNodes: (nodes: MapNode[]) => void;
  setCustomTiles: (tiles: CustomTile[]) => void;
  loadTilesFromSupabase: () => Promise<void>;
  
  addNode: (node: Omit<MapNode, 'id'>) => Promise<void>;
  updateNode: (id: string, updates: Partial<MapNode>) => Promise<void>;
  removeNode: (id: string) => Promise<void>;
  selectNode: (id: string | null) => void;
  selectTile: (id: string | null) => void;
  setDraggingTile: (id: string | null) => void;
  setDraggingNode: (id: string | null) => void;
  setTool: (tool: ToolType, nodeType?: NodeType | null) => void;
  addCustomTile: (tile: CustomTile) => Promise<void>;
  removeCustomTile: (id: string) => Promise<void>;
  updateCustomTile: (id: string, updates: Partial<CustomTile>) => Promise<void>;
  reorderCustomTiles: (tiles: CustomTile[]) => Promise<void>;
  setSpawnPoint: (x: number, y: number) => void;
  addTile: (tile: Tile) => void;
  addTileSimple: (x: number, y: number, type: string, imageUrl: string, isSpritesheet?: boolean, frameCount?: number, frameWidth?: number, frameHeight?: number, animationSpeed?: number, layer?: number, offsetX?: number, offsetY?: number, isWalkable?: boolean, snapToGrid?: boolean, isAutoFill?: boolean, isAutoTile?: boolean, bitmask?: number, elevation?: number, hasFoam?: boolean, foamBitmask?: number, smartType?: string, rotation?: number, blockCol?: number, blockRow?: number, edgeBlocks?: number) => Promise<void>;
  batchAddTiles: (newTiles: Omit<Tile, 'id'>[]) => Promise<void>;
  removeTileAt: (x: number, y: number, excludeAutoTiles?: boolean) => Promise<Tile | null>;
  removeTileById: (id: string, excludeAutoTiles?: boolean) => Promise<void>;
  moveTile: (tileId: string, newX: number, newY: number, newOffsetX: number, newOffsetY: number) => Promise<void>;
  rotateTile: (tileId: string, rotationDelta: number) => Promise<void>;
  replaceCustomTileAsset: (id: string, newUrl: string) => Promise<void>;
  updateTileAndNeighbors: (x: number, y: number, layer: number, isRemoving?: boolean, smartType?: string, blockCol?: number, blockRow?: number) => Promise<void>; // NEW
  batchUpdateTileAndNeighbors: (updates: { x: number, y: number, layer: number, isRemoving?: boolean, smartType?: string, blockCol?: number, blockRow?: number }[]) => Promise<void>;
  forceSyncAllChunks: () => Promise<void>;
  syncChunks: (chunkKeys: string[]) => void; // NEW: Optimised sync for specific chunks
  exportMap: () => string;
}

export const useMapStore = create<MapState>((set, get) => ({
  tiles: [],
  nodes: [],
  customTiles: [],
  selectedNodeId: null,
  selectedTileId: null,
  selectedTool: 'select',
  activeNodeType: null,
  isDraggingNode: false,
  draggingNodeId: null,
  isDraggingTile: false,
  draggingTileId: null,
  dragGrabOffset: null,
  setDragGrabOffset: (dragGrabOffset) => set({ dragGrabOffset }),
  isLoadingTiles: false,
  spawnPoint: null,

  brushSize: 1,
  setBrushSize: (brushSize) => set({ brushSize }),

  brushMode: false,
  setBrushMode: (brushMode) => set({ brushMode }),
  snapMode: 'full',
  setSnapMode: (snapMode) => set({ snapMode }),

  nodeSnapToGrid: true,
  setNodeSnapToGrid: (nodeSnapToGrid) => set({ nodeSnapToGrid }),

  // Layout initial state
  sidebarWidth: 320,
  rightSidebarWidth: 320,
  setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
  setRightSidebarWidth: (rightSidebarWidth) => set({ rightSidebarWidth }),

  // Layer initial state
  layerSettings: {
    '-1': { locked: false, hidden: false }, // Water
    0: { locked: false, hidden: false }, // Ground
    1: { locked: false, hidden: false }, // Roads
    2: { locked: false, hidden: false }  // Props
  },
  setLayerVisibility: (layer, visible) => set((state) => ({
    layerSettings: {
      ...state.layerSettings,
      [layer]: { ...state.layerSettings[layer], hidden: !visible }
    }
  })),
  setLayerLocked: (layer, locked) => set((state) => ({
    layerSettings: {
      ...state.layerSettings,
      [layer]: { ...state.layerSettings[layer], locked }
    }
  })),

  // Favorites initial state
  favorites: Array(9).fill(null),
  setFavorite: (index, tileId) => set((state) => {
    const newFavorites = [...state.favorites];
    newFavorites[index] = tileId;
    return { favorites: newFavorites };
  }),

  // Stamps & Selection initial state
  selection: null,
  currentStamp: null,
  setSelection: (selection) => set({ selection }),
  setCurrentStamp: (currentStamp) => set({ currentStamp }),

  isSmartMode: false,
  smartBrushLock: false,
  selectedSmartType: 'off',
  selectedBlockCol: 0,
  selectedBlockRow: 0,
  smartBrushLayer: 0,
  terrainOffsets: {
    grass: { flat: [0, 0], raised: [0, 192] },
    dirt: { flat: [0, 384], raised: [0, 576] }
  },
  isRaiseMode: false,
  isFoamEnabled: true,
  autoTileSheetUrl: null,
  dirtSheetUrl: null,
  waterSheetUrl: null,
  selectedWaterBaseId: null,
  selectedFoamStripId: null,
  collisionMode: 'full',
  edgeDirection: 4,
  showWalkabilityOverlay: false,
  showDebugModal: false,
  showDebugNumbers: false,

  setSmartMode: (isSmartMode) => set({ isSmartMode }),
  setSmartBrushLock: (smartBrushLock) => set({ smartBrushLock }),
  setSelectedSmartType: (selectedSmartType) => set({ selectedSmartType, isSmartMode: selectedSmartType !== 'off' }),
  setSelectedBlock: (selectedBlockCol, selectedBlockRow) => set({ selectedBlockCol, selectedBlockRow }),
  setSmartBrushLayer: (smartBrushLayer) => set({ smartBrushLayer }),
  setRaiseMode: (enabled: boolean) => set({ isRaiseMode: enabled }),
  setFoamEnabled: (isFoamEnabled) => set({ isFoamEnabled }),
  setCollisionMode: (collisionMode) => set({ collisionMode }),
  setEdgeDirection: (edgeDirection) => set({ edgeDirection }),
  setShowWalkabilityOverlay: (showWalkabilityOverlay) => set({ showWalkabilityOverlay }),
  setShowDebugModal: (showDebugModal) => set({ showDebugModal }),
  setShowDebugNumbers: (showDebugNumbers) => set({ showDebugNumbers }),

  // Undo stack initial state and functions
  undoStack: [],
  setUndoStack: (updater) => set((state) => ({ undoStack: updater(state.undoStack) })),
  pushUndo: (action) => set((state) => ({ undoStack: [...state.undoStack, action] })),

  setAutoTileSheetUrl: async (url) => {
    set({ autoTileSheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, autotile_sheet_url: url }, { onConflict: 'id' });
  },
  setDirtSheetUrl: async (url) => {
    set({ dirtSheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, dirt_sheet_url: url }, { onConflict: 'id' });
  },
  setWaterSheetUrl: async (url) => {
    set({ waterSheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, water_sheet_url: url }, { onConflict: 'id' });
  },
  setSelectedWaterBaseId: async (id) => { // NEW
    set({ selectedWaterBaseId: id });
    const tile = get().customTiles.find(t => t.id === id);
    if (tile) {
      await supabase.from('world_map_settings').upsert({ id: 1, water_base_url: tile.url }, { onConflict: 'id' });
    }
  },
  setSelectedFoamStripId: async (id) => { // NEW
    set({ selectedFoamStripId: id });
    const tile = get().customTiles.find(t => t.id === id);
    if (tile) {
      await supabase.from('world_map_settings').upsert({ 
        id: 1, 
        foam_sheet_url: tile.url,
        foam_is_spritesheet: tile.isSpritesheet || false,
        foam_frame_count: tile.frameCount || 1,
        foam_frame_width: tile.frameWidth || 48,
        foam_frame_height: tile.frameHeight || 48,
        foam_animation_speed: String(tile.animationSpeed || 0.8)
      }, { onConflict: 'id' });
    }
  },

  waterBaseTile: () => get().customTiles.find(t => t.id === get().selectedWaterBaseId), // NEW SELECTOR
  foamStripTile: () => get().customTiles.find(t => t.id === get().selectedFoamStripId), // NEW SELECTOR

  setTiles: (tiles) => set({ tiles }),
  setNodes: (nodes) => set({ nodes }),
  setCustomTiles: (customTiles) => set({ customTiles }),

  loadTilesFromSupabase: async () => {
    set({ isLoadingTiles: true });
    // Load Global Settings
    const { data: settingsData } = await supabase.from('world_map_settings').select('*').eq('id', 1).maybeSingle();
    let initialWaterBaseId = null;
    let initialFoamStripId = null;

    if (settingsData) {
      set({
        autoTileSheetUrl: settingsData.autotile_sheet_url,
        dirtSheetUrl: settingsData.dirt_sheet_url,
        waterSheetUrl: settingsData.water_sheet_url,
      });
    }

    // Load Chunks
    const { data: chunksData } = await supabase.from('map_chunks').select('*');
    if (chunksData) {
      const allTiles: Tile[] = [];
      chunksData.forEach((chunk: any) => {
        const tileData = chunk.tile_data;
        if (Array.isArray(tileData)) {
          tileData.forEach((t: any) => {
            // CRITICAL: Prevent corrupted tiles with NaN/null coordinates from crashing rendering bounds
            if (typeof t.x !== 'number' || typeof t.y !== 'number' || isNaN(t.x) || isNaN(t.y)) {
               return;
            }

            allTiles.push({
              id: uuidv4(),
              x: t.x,
              y: t.y,
              imageUrl: t.imageUrl,
              type: t.type,
              isSpritesheet: t.isSpritesheet,
              frameCount: t.frameCount,
              frameWidth: t.frame_width || t.frameWidth,
              frameHeight: t.frame_height || t.frameHeight,
              animationSpeed: t.animationSpeed,
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
              edgeBlocks: t.edgeBlocks,
            });
          });
        }
      });
      set({ tiles: allTiles });
    }

    // Load Custom Tile Library
    const { data: customTilesData } = await supabase.from('custom_tiles').select('*').order('sort_order', { ascending: true });
    if (customTilesData) {
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
        isWalkable: t.is_walkable ?? true,
        snapToGrid: t.snap_to_grid ?? false,
        isAutoFill: t.is_autofill ?? true,
        isAutoTile: t.is_autotile ?? false,
        smartType: t.smartType,
        category: t.category,
        rotation: t.rotation || 0,
        sort_order: t.sort_order || 0
      }));

      // Match the loaded URLs from settings back to the custom tile IDs
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

    // Load Nodes with Global Coordinates
    const { data: nodesData } = await supabase.from('world_map_nodes').select('*');
    if (nodesData) {
      set({
        nodes: nodesData.map((n: any) => ({
          id: n.id,
          x: n.global_x ?? n.x,
          y: n.global_y ?? n.y,
          type: n.type,
          name: n.name,
          iconUrl: n.icon_url,
          properties: n.interaction_data
        }))
      });
    }
    set({ isLoadingTiles: false });
  },

  addNode: async (node) => {
    const newId = uuidv4();
    set((state) => ({ 
      nodes: [...state.nodes, { ...node, id: newId }] 
    }));
    const { error } = await supabase.from('world_map_nodes').insert({
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
    });
    if (error) {
      // Keep the node in local state so the editor doesn't "lose" work,
      // but surface the failure so it can be investigated.
      console.error('Failed to persist world_map_node on insert', error);
    }
  },

  updateNode: async (id, updates) => {
    // 1) Update local state optimistically
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    }));

    // 2) Read the latest version back from state for persistence
    const updatedNode = get().nodes.find((n) => n.id === id);
    if (!updatedNode) return;

    const { error } = await supabase
      .from('world_map_nodes')
      .update({
        global_x: updatedNode.x,
        global_y: updatedNode.y,
        name: updatedNode.name,
        type: updatedNode.type,
        icon_url: updatedNode.iconUrl,
        interaction_data: updatedNode.properties || {},
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to persist world_map_node on update', error);
    }
  },

  removeNode: async (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }));
    const { error } = await supabase.from('world_map_nodes').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete world_map_node', error);
    }
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedTileId: null, selectedTool: 'select' }),
  
  selectTile: (id) => set({ selectedTileId: id, selectedNodeId: null, selectedTool: 'paint' }),

  setDraggingTile: (id) => set({ draggingTileId: id, isDraggingTile: !!id }),
  setDraggingNode: (id) => set({ draggingNodeId: id, isDraggingNode: !!id }),

  setTool: (tool, nodeType = null) => set({ 
    selectedTool: tool, 
    activeNodeType: nodeType,
    selectedNodeId: null,
    selectedTileId: tool === 'paint' ? get().selectedTileId : null,
    draggingTileId: null,
    draggingNodeId: null,
    isDraggingTile: false,
    isDraggingNode: false
  }),

  addCustomTile: async (tile) => {
    set((state) => ({
      customTiles: [...state.customTiles, tile]
    }));
    const { error } = await supabase.from('custom_tiles').insert({
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
      smartType: tile.smartType, // Ensure smartType is saved
      category: tile.category, // NEW
      rotation: tile.rotation || 0,
      sort_order: tile.sort_order || 0
    });
    if (error) console.error("Failed to add custom tile:", error);
  },

  removeCustomTile: async (id) => {
    set((state) => ({
      customTiles: state.customTiles.filter(t => t.id !== id),
      selectedTileId: state.selectedTileId === id ? null : state.selectedTileId
    }));
    const { error } = await supabase.from('custom_tiles').delete().eq('id', id);
    if (error) console.error("Failed to remove custom tile:", error);
  },

  updateCustomTile: async (id, updates) => {
    set((state) => ({
      customTiles: state.customTiles.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    
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
      const { error } = await supabase.from('custom_tiles').update(dbUpdates).eq('id', id);
      if (error) {
        console.error("Failed to update custom tile:", error.message, error.details, error.hint);
      }
    }
  },

  reorderCustomTiles: async (tiles) => {
    set({ customTiles: tiles });
    
    // Batch update sort order in Supabase
    const updates = tiles.map((t, index) => ({
      id: t.id,
      sort_order: index
    }));

    // Debounce the Supabase call to avoid lag when dragging quickly
    if ((window as any)._reorderTimeout) {
      clearTimeout((window as any)._reorderTimeout);
    }
    
    (window as any)._reorderTimeout = setTimeout(async () => {
      // Create a single upsert instead of firing N individual requests which can cause rate limiting/lag
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // We can't do bulk upsert easily with partial updates via the client so we fall back to Promise.all
      // but only run it once dragging has stopped for 500ms
      try {
        await Promise.all(updates.map(u => 
          supabase.from('custom_tiles').update({ sort_order: u.sort_order }).eq('id', u.id)
        ));
      } catch (e) {
        console.error('Failed to sync reorder', e);
      }
    }, 500);
  },

  setSpawnPoint: (x, y) => set({ spawnPoint: { x, y } }),

  addTile: (tile) => set((state) => ({
    tiles: [...state.tiles.filter(t => t.x !== tile.x || t.y !== tile.y), tile]
  })),

  addTileSimple: async (x: number, y: number, type: string, imageUrl: string, isSpritesheet?: boolean, frameCount?: number, frameWidth?: number, frameHeight?: number, animationSpeed?: number, layer?: number, offsetX?: number, offsetY?: number, isWalkable?: boolean, snapToGrid?: boolean, isAutoFill?: boolean, isAutoTile?: boolean, bitmask?: number, elevation?: number, hasFoam?: boolean, foamBitmask?: number, smartType?: string, rotation?: number, blockCol?: number, blockRow?: number, edgeBlocks?: number) => {
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
          Math.abs((t.offsetX || 0) - (offsetX || 0)) < 8 &&
          Math.abs((t.offsetY || 0) - (offsetY || 0)) < 8
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
        ...(edgeBlocks !== undefined ? { edgeBlocks } : {})
      };

      if (existingIdx !== -1) {
        const newTiles = [...state.tiles];
        newTiles[existingIdx] = newTile;
        return { tiles: newTiles };
      } else {
        return { tiles: [...state.tiles, newTile] };
      }
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
      const tileMap = new Map(state.tiles.map(t => [`${t.x},${t.y},${t.layer || 0}`, t]));
      newTiles.forEach(nt => {
        tileMap.set(`${nt.x},${nt.y},${nt.layer || 0}`, { ...nt, id: uuidv4() } as Tile);
      });
      return { tiles: Array.from(tileMap.values()) };
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

    set((state) => ({
      tiles: state.tiles.filter(t => t.id !== removedTile!.id)
    }));

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

    set((state) => ({
      tiles: state.tiles.filter(t => t.id !== id)
    }));

    // Debounced sync to Supabase
    triggerChunkSync(chunkX, chunkY, get);
  },

  moveTile: async (tileId, newX, newY, newOffsetX, newOffsetY) => {
    const tile = get().tiles.find(t => t.id === tileId);
    if (!tile) return;

    const oldX = tile.x;
    const oldY = tile.y;

    // 1. Update local state
    set((state) => ({
      tiles: state.tiles.map(t => t.id === tileId ? { 
        ...t, 
        x: newX, 
        y: newY, 
        offsetX: newOffsetX, 
        offsetY: newOffsetY 
      } : t)
    }));

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

  replaceCustomTileAsset: async (id, newUrl) => {
    const state = get();
    const oldTile = state.customTiles.find(t => t.id === id);
    if (!oldTile) return;

    const oldUrl = oldTile.url;

    // 1. Update Custom Tile Library
    set((state) => ({
      customTiles: state.customTiles.map(t => t.id === id ? { ...t, url: newUrl } : t)
    }));
    
    await supabase.from('custom_tiles').update({ url: newUrl }).eq('id', id);

    // 2. Update all placed tiles that use this asset
    const touchedChunks = new Set<string>();
    set((state) => {
      const newTiles = state.tiles.map(t => {
        if (t.imageUrl === oldUrl) {
          touchedChunks.add(`${Math.floor(t.x / CHUNK_SIZE)},${Math.floor(t.y / CHUNK_SIZE)}`);
          return { ...t, imageUrl: newUrl };
        }
        return t;
      });
      return { tiles: newTiles };
    });

    // 3. Trigger debounced sync for touched chunks
    touchedChunks.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      triggerChunkSync(cx, cy, get);
    });
  },

  forceSyncAllChunks: async () => {
    // Recompute all chunks from the current in-memory tiles and upsert them.
    const allTiles = get().tiles;
    const chunks = new Map<string, Tile[]>();

    allTiles.forEach(t => {
      const cx = Math.floor(t.x / CHUNK_SIZE);
      const cy = Math.floor(t.y / CHUNK_SIZE);
      const key = `${cx},${cy}`;
      if (!chunks.has(key)) chunks.set(key, []);
      chunks.get(key)!.push(t);
    });

    const promises = Array.from(chunks.entries()).map(async ([key, tiles]) => {
      const [cx, cy] = key.split(',').map(Number);
      const chunkTiles = tiles.map(t => {
        const { id, ...rest } = t;
        return { ...rest, block_col: t.blockCol || 0, block_row: t.blockRow || 0 };
      });

      await supabase.from('map_chunks').upsert({
        chunk_x: cx,
        chunk_y: cy,
        tile_data: chunkTiles,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    });

    await Promise.all(promises);
  },

  syncChunks: (chunkKeys: string[]) => {
    const uniqueKeys = new Set(chunkKeys);
    uniqueKeys.forEach(key => {
      const [cx, cy] = key.split(',').map(Number);
      triggerChunkSync(cx, cy, get);
    });
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
  }
}));
