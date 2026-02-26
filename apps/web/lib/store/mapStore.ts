'use client';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase';

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
  category?: 'water_base' | 'foam_strip' | 'tile' | 'prop' | 'road';
  rotation?: number; // Default rotation
}

export type ToolType = 'select' | 'paint' | 'erase' | 'node' | 'stamp' | 'eyedropper';

const CHUNK_SIZE = 16;

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
  isDraggingTile: boolean;
  draggingTileId: string | null;
  spawnPoint: { x: number; y: number } | null;
  
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
  selectedSmartType: string; // 'off' | 'grass' | 'dirt'
  selectedBlockCol: number;
  selectedBlockRow: number;
  terrainOffsets: Record<string, { flat: [number, number], raised: [number, number] }>;
  isRaiseMode: boolean;
  isFoamEnabled: boolean;
  autoTileSheetUrl: string | null;
  dirtSheetUrl: string | null;
  selectedWaterBaseId: string | null; // NEW
  selectedFoamStripId: string | null; // NEW
  setSmartMode: (enabled: boolean) => void;
  setSelectedSmartType: (type: string) => void;
  setSelectedBlock: (col: number, row: number) => void;
  setRaiseMode: (enabled: boolean) => void;
  setFoamEnabled: (enabled: boolean) => void;
  setAutoTileSheetUrl: (url: string | null) => Promise<void>;
  setDirtSheetUrl: (url: string | null) => Promise<void>;
  setSelectedWaterBaseId: (id: string | null) => Promise<void>; // NEW
  setSelectedFoamStripId: (id: string | null) => Promise<void>; // NEW
  waterBaseTile: () => CustomTile | undefined; // NEW SELECTOR
  foamStripTile: () => CustomTile | undefined; // NEW SELECTOR
  
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
  setTool: (tool: ToolType, nodeType?: NodeType | null) => void;
  addCustomTile: (tile: CustomTile) => Promise<void>;
  removeCustomTile: (id: string) => Promise<void>;
  updateCustomTile: (id: string, updates: Partial<CustomTile>) => Promise<void>;
  setSpawnPoint: (x: number, y: number) => void;
  addTile: (tile: Tile) => void;
  addTileSimple: (x: number, y: number, type: string, imageUrl: string, isSpritesheet?: boolean, frameCount?: number, frameWidth?: number, frameHeight?: number, animationSpeed?: number, layer?: number, offsetX?: number, offsetY?: number, isWalkable?: boolean, snapToGrid?: boolean, isAutoFill?: boolean, isAutoTile?: boolean, bitmask?: number, elevation?: number, hasFoam?: boolean, foamBitmask?: number, smartType?: string, rotation?: number, blockCol?: number, blockRow?: number) => Promise<void>;
  batchAddTiles: (newTiles: Omit<Tile, 'id'>[]) => Promise<void>;
  removeTileAt: (x: number, y: number) => Promise<Tile | null>;
  removeTileById: (id: string) => Promise<void>;
  moveTile: (tileId: string, newX: number, newY: number, newOffsetX: number, newOffsetY: number) => Promise<void>;
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
  isDraggingTile: false,
  draggingTileId: null,
  spawnPoint: null,

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
  selectedSmartType: 'off',
  selectedBlockCol: 0,
  selectedBlockRow: 0,
  terrainOffsets: {
    grass: { flat: [0, 0], raised: [0, 192] },
    dirt: { flat: [0, 384], raised: [0, 576] }
  },
  isRaiseMode: false,
  isFoamEnabled: true,
  autoTileSheetUrl: null,
  dirtSheetUrl: null,
  selectedWaterBaseId: null, // NEW
  selectedFoamStripId: null, // NEW

  setSmartMode: (isSmartMode) => set({ isSmartMode }),
  setSelectedSmartType: (selectedSmartType) => set({ selectedSmartType, isSmartMode: selectedSmartType !== 'off' }),
  setSelectedBlock: (selectedBlockCol, selectedBlockRow) => set({ selectedBlockCol, selectedBlockRow }),
  setRaiseMode: (isRaiseMode) => set({ isRaiseMode }),
  setFoamEnabled: (isFoamEnabled) => set({ isFoamEnabled }),
  setAutoTileSheetUrl: async (url) => {
    set({ autoTileSheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, autotile_sheet_url: url }, { onConflict: 'id' });
  },
  setDirtSheetUrl: async (url) => {
    set({ dirtSheetUrl: url });
    await supabase.from('world_map_settings').upsert({ id: 1, dirt_sheet_url: url }, { onConflict: 'id' });
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
    // Load Global Settings
    const { data: settingsData } = await supabase.from('world_map_settings').select('*').eq('id', 1).maybeSingle();
    let initialWaterBaseId = null;
    let initialFoamStripId = null;

    if (settingsData) {
      set({
        autoTileSheetUrl: settingsData.autotile_sheet_url,
        dirtSheetUrl: settingsData.dirt_sheet_url,
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
            allTiles.push({
              id: uuidv4(),
              x: t.x,
              y: t.y,
              imageUrl: t.imageUrl,
              type: t.type,
              isSpritesheet: t.isSpritesheet,
              frameCount: t.frameCount,
              frameWidth: t.frameWidth,
              frameHeight: t.frameHeight,
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
              rotation: t.rotation || 0
            });
          });
        }
      });
      set({ tiles: allTiles });
    }

    // Load Custom Tile Library
    const { data: customTilesData } = await supabase.from('custom_tiles').select('*');
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
        rotation: t.rotation || 0
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
  },

  addNode: async (node) => {
    const newId = uuidv4();
    set((state) => ({ 
      nodes: [...state.nodes, { ...node, id: newId }] 
    }));
    await supabase.from('world_map_nodes').insert({
      id: newId,
      global_x: node.x,
      global_y: node.y,
      x: 0,
      y: 0,
      type: node.type,
      name: node.name,
      icon_url: node.iconUrl,
      interaction_type: node.type === 'spawn' ? 'CITY' : node.type === 'enemy' ? 'BATTLE' : 'DIALOGUE',
      interaction_data: node.properties || {}
    });
  },

  updateNode: async (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((n) => n.id === id ? { ...n, ...updates } : n)
    }));
    const node = get().nodes.find(n => n.id === id);
    if (node) {
      await supabase.from('world_map_nodes').update({
        global_x: node.x,
        global_y: node.y,
        name: node.name,
        type: node.type,
        icon_url: node.iconUrl,
        interaction_data: node.properties || {}
      }).eq('id', id);
    }
  },

  removeNode: async (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }));
    await supabase.from('world_map_nodes').delete().eq('id', id);
  },

  selectNode: (id) => set({ selectedNodeId: id, selectedTileId: null, selectedTool: 'select' }),
  
  selectTile: (id) => set({ selectedTileId: id, selectedNodeId: null, selectedTool: 'paint' }),

  setDraggingTile: (id) => set({ draggingTileId: id, isDraggingTile: !!id }),

  setTool: (tool, nodeType = null) => set({ 
    selectedTool: tool, 
    activeNodeType: nodeType,
    selectedNodeId: null,
    selectedTileId: tool === 'paint' ? get().selectedTileId : null,
    draggingTileId: null,
    isDraggingTile: false
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
      rotation: tile.rotation || 0
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
    const tile = get().customTiles.find(t => t.id === id);
    if (tile) {
      const { error } = await supabase.from('custom_tiles').update({
        name: tile.name,
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
        smartType: tile.smartType, // Ensure smartType is updated
        category: tile.category, // NEW
        rotation: tile.rotation || 0
      }).eq('id', id);
      if (error) console.error("Failed to update custom tile:", error);
    }
  },

  setSpawnPoint: (x, y) => set({ spawnPoint: { x, y } }),

  addTile: (tile) => set((state) => ({
    tiles: [...state.tiles.filter(t => t.x !== tile.x || t.y !== tile.y), tile]
  })),

  addTileSimple: async (x: number, y: number, type: string, imageUrl: string, isSpritesheet?: boolean, frameCount?: number, frameWidth?: number, frameHeight?: number, animationSpeed?: number, layer?: number, offsetX?: number, offsetY?: number, isWalkable?: boolean, snapToGrid?: boolean, isAutoFill?: boolean, isAutoTile?: boolean, bitmask?: number, elevation?: number, hasFoam?: boolean, foamBitmask?: number, smartType?: string, rotation?: number, blockCol?: number, blockRow?: number) => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    // 1. Update local state (keep full data for instant web rendering)
    set((state) => ({
      tiles: [...state.tiles.filter(t => !(t.x === x && t.y === y && t.layer === (layer || 0))), {
        id: uuidv4(),
        x,
        y,
        type,
        imageUrl,
        isSpritesheet,
        frameCount,
        frameWidth,
        frameHeight,
        animationSpeed,
        layer: layer || 0,
        offsetX: offsetX || 0,
        offsetY: offsetY || 0,
        isWalkable: isWalkable ?? true,
        snapToGrid: snapToGrid ?? false,
        isAutoFill: isAutoFill ?? true,
        isAutoTile,
        bitmask,
        elevation,
        hasFoam,
        foamBitmask,
        smartType,
        blockCol: blockCol || 0,
        blockRow: blockRow || 0,
        rotation: rotation || 0
      }]
    }));

    // 2. Sync Chunk to Supabase (Strip the bloat!)
    const { data: existingChunk } = await supabase
      .from('map_chunks')
      .select('tile_data')
      .eq('chunk_x', chunkX)
      .eq('chunk_y', chunkY)
      .maybeSingle();

    let newTileData = existingChunk?.tile_data || [];
    if (!Array.isArray(newTileData)) newTileData = [];
    
    // Remove existing tile at this pos AND layer within chunk data
    newTileData = newTileData.filter((t: any) => !(t.x === x && t.y === y && (t.layer || 0) === (layer || 0)));
    
    // Add new lightweight tile
    newTileData.push({ 
      x, 
      y, 
      imageUrl, 
      layer: layer || 0, 
      offsetX: offsetX || 0, 
      offsetY: offsetY || 0, 
      isAutoTile, 
      bitmask, 
      elevation, 
      foamBitmask, 
      smartType, 
      blockCol: blockCol || 0,
      blockRow: blockRow || 0,
      block_col: blockCol || 0, // Fallback for old data
      block_row: blockRow || 0, // Fallback for old data
      rotation: rotation || 0
    });

    await supabase.from('map_chunks').upsert({
      chunk_x: chunkX,
      chunk_y: chunkY,
      tile_data: newTileData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'chunk_x,chunk_y' });
  },

  batchAddTiles: async (newTiles) => {
    // Group tiles by chunk
    const chunks: Record<string, any[]> = {};
    newTiles.forEach(tile => {
      const cx = Math.floor(tile.x / CHUNK_SIZE);
      const cy = Math.floor(tile.y / CHUNK_SIZE);
      const key = `${cx},${cy}`;
      if (!chunks[key]) chunks[key] = [];
      chunks[key].push(tile);
    });

    // 1. Update local state with full data
    set((state) => {
      const tileMap = new Map(state.tiles.map(t => [`${t.x},${t.y},${t.layer || 0}`, t]));
      newTiles.forEach(nt => {
        tileMap.set(`${nt.x},${nt.y},${nt.layer || 0}`, { ...nt, id: uuidv4() } as Tile);
      });
      return { tiles: Array.from(tileMap.values()) };
    });

    // 2. Update chunks in Supabase (Strip the bloat!)
    for (const [key, tiles] of Object.entries(chunks)) {
      const [cx, cy] = key.split(',').map(Number);
      
      const { data: existingChunk } = await supabase
        .from('map_chunks')
        .select('tile_data')
        .eq('chunk_x', cx)
        .eq('chunk_y', cy)
        .maybeSingle();

      let tileData = existingChunk?.tile_data || [];
      if (!Array.isArray(tileData)) tileData = [];

      tiles.forEach(newTile => {
        tileData = tileData.filter((t: any) => !(t.x === newTile.x && t.y === newTile.y && (t.layer || 0) === (newTile.layer || 0)));
        
        // Push only lightweight tile
        tileData.push({
          x: newTile.x,
          y: newTile.y,
          imageUrl: newTile.imageUrl,
          layer: newTile.layer || 0,
          offsetX: newTile.offsetX || 0,
          offsetY: newTile.offsetY || 0,
          isAutoTile: newTile.isAutoTile,
          bitmask: newTile.bitmask,
          elevation: newTile.elevation,
          foamBitmask: newTile.foamBitmask,
          smartType: newTile.smartType,
          blockCol: newTile.blockCol || 0,
          blockRow: newTile.blockRow || 0,
          block_col: newTile.blockCol || 0,
          block_row: newTile.blockRow || 0,
          rotation: newTile.rotation || 0
        });
      });

      await supabase.from('map_chunks').upsert({
        chunk_x: cx,
        chunk_y: cy,
        tile_data: tileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    }
  },

  removeTileAt: async (x, y) => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    let removedTile: Tile | null = null;
    let targetLayer: number | undefined;

    // Remove the highest layer tile first
    const existingTilesAtPos = get().tiles.filter(t => t.x === x && t.y === y).sort((a, b) => (b.layer || 0) - (a.layer || 0));
    
    if (existingTilesAtPos.length > 0) {
      removedTile = existingTilesAtPos[0];
      targetLayer = removedTile.layer || 0;
    } else {
      return null; // Nothing to remove
    }

    set((state) => ({
      tiles: state.tiles.filter(t => !(t.x === x && t.y === y && (t.layer || 0) === targetLayer))
    }));

    const { data: existingChunk } = await supabase
      .from('map_chunks')
      .select('tile_data')
      .eq('chunk_x', chunkX)
      .eq('chunk_y', chunkY)
      .maybeSingle();

    if (existingChunk?.tile_data) {
      const newTileData = existingChunk.tile_data.filter((t: any) => !(t.x === x && t.y === y && (t.layer || 0) === targetLayer));
      await supabase.from('map_chunks').upsert({
        chunk_x: chunkX,
        chunk_y: chunkY,
        tile_data: newTileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    }

    return removedTile;
  },

  removeTileById: async (id) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === id);
    if (!tile) return;

    const { x, y, layer } = tile;
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    set((state) => ({
      tiles: state.tiles.filter(t => t.id !== id)
    }));

    const { data: existingChunk } = await supabase
      .from('map_chunks')
      .select('tile_data')
      .eq('chunk_x', chunkX)
      .eq('chunk_y', chunkY)
      .maybeSingle();

    if (existingChunk?.tile_data) {
      const newTileData = existingChunk.tile_data.filter((t: any) => !(t.x === x && t.y === y && (t.layer || 0) === (layer || 0)));
      await supabase.from('map_chunks').upsert({
        chunk_x: chunkX,
        chunk_y: chunkY,
        tile_data: newTileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    }
  },

  moveTile: async (tileId, newX, newY, newOffsetX, newOffsetY) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile) return;

    const oldX = tile.x;
    const oldY = tile.y;
    const layer = tile.layer || 0;

    // 1. Update local state with full data
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

    // Remove from old chunk
    const { data: oldChunk } = await supabase.from('map_chunks').select('tile_data').eq('chunk_x', oldChunkX).eq('chunk_y', oldChunkY).maybeSingle();
    if (oldChunk?.tile_data) {
      const updatedOldTileData = oldChunk.tile_data.filter((t: any) => !(t.x === oldX && t.y === oldY && (t.layer || 0) === layer));
      await supabase.from('map_chunks').upsert({
        chunk_x: oldChunkX,
        chunk_y: oldChunkY,
        tile_data: updatedOldTileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    }

    // Add to new chunk (Strip the bloat!)
    const { data: newChunk } = await supabase.from('map_chunks').select('tile_data').eq('chunk_x', newChunkX).eq('chunk_y', newChunkY).maybeSingle();
    let newTileData = newChunk?.tile_data || [];
    if (!Array.isArray(newTileData)) newTileData = [];
    
    // Ensure we don't duplicate if it moved within the same chunk
    newTileData = newTileData.filter((t: any) => !(t.x === newX && t.y === newY && (t.layer || 0) === layer));
    
    newTileData.push({ 
      x: newX, 
      y: newY, 
      imageUrl: tile.imageUrl, 
      layer: layer, 
      offsetX: newOffsetX, 
      offsetY: newOffsetY,
      isAutoTile: tile.isAutoTile,
      bitmask: tile.bitmask,
      elevation: tile.elevation,
      foamBitmask: tile.foamBitmask,
      smartType: tile.smartType,
      blockCol: tile.blockCol || 0,
      blockRow: tile.blockRow || 0,
      block_col: tile.blockCol || 0,
      block_row: tile.blockRow || 0,
      rotation: tile.rotation || 0
    });

    await supabase.from('map_chunks').upsert({
      chunk_x: newChunkX,
      chunk_y: newChunkY,
      tile_data: newTileData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'chunk_x,chunk_y' });
  },

  exportMap: () => {
    const state = get();
    return JSON.stringify({
      version: '1.1.0',
      tiles: state.tiles,
      nodes: state.nodes,
      spawnPoint: state.spawnPoint
    }, null, 2);
  }
}));
