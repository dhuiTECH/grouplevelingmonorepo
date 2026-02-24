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
}

export type ToolType = 'select' | 'paint' | 'erase' | 'node';

const CHUNK_SIZE = 16;

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
  addTileSimple: (x: number, y: number, type: string, imageUrl: string, isSpritesheet?: boolean, frameCount?: number, frameWidth?: number, frameHeight?: number, animationSpeed?: number, layer?: number, offsetX?: number, offsetY?: number, isWalkable?: boolean, snapToGrid?: boolean, isAutoFill?: boolean) => Promise<void>;
  batchAddTiles: (newTiles: Omit<Tile, 'id'>[]) => Promise<void>;
  removeTileAt: (x: number, y: number) => Promise<Tile | null>;
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

  setTiles: (tiles) => set({ tiles }),
  setNodes: (nodes) => set({ nodes }),
  setCustomTiles: (customTiles) => set({ customTiles }),

  loadTilesFromSupabase: async () => {
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
              snapToGrid: t.snap_to_grid ?? false
            });
          });
        }
      });
      set({ tiles: allTiles });
    }

    // Load Custom Tile Library
    const { data: customTilesData } = await supabase.from('custom_tiles').select('*');
    if (customTilesData) {
      set({
        customTiles: customTilesData.map((t: any) => ({
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
          isAutoFill: t.is_autofill ?? true
        }))
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
    await supabase.from('custom_tiles').insert({
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
      is_autofill: tile.isAutoFill ?? true
    });
  },

  removeCustomTile: async (id) => {
    set((state) => ({
      customTiles: state.customTiles.filter(t => t.id !== id),
      selectedTileId: state.selectedTileId === id ? null : state.selectedTileId
    }));
    await supabase.from('custom_tiles').delete().eq('id', id);
  },

  updateCustomTile: async (id, updates) => {
    set((state) => ({
      customTiles: state.customTiles.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
    const tile = get().customTiles.find(t => t.id === id);
    if (tile) {
      await supabase.from('custom_tiles').update({
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
        is_autofill: tile.isAutoFill ?? true
      }).eq('id', id);
    }
  },

  setSpawnPoint: (x, y) => set({ spawnPoint: { x, y } }),

  addTile: (tile) => set((state) => ({
    tiles: [...state.tiles.filter(t => t.x !== tile.x || t.y !== tile.y), tile]
  })),

  addTileSimple: async (x: number, y: number, type: string, imageUrl: string, isSpritesheet?: boolean, frameCount?: number, frameWidth?: number, frameHeight?: number, animationSpeed?: number, layer?: number, offsetX?: number, offsetY?: number, isWalkable?: boolean, snapToGrid?: boolean, isAutoFill?: boolean) => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

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
        isAutoFill: isAutoFill ?? true
      }]
    }));

    // Sync Chunk to Supabase
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
    // Add new tile
    newTileData.push({ x, y, type, imageUrl, isSpritesheet, frameCount, frameWidth, frameHeight, animationSpeed, layer: layer || 0, offsetX: offsetX || 0, offsetY: offsetY || 0, isWalkable: isWalkable ?? true, snapToGrid: snapToGrid ?? false, isAutoFill: isAutoFill ?? true });

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

    // Update local state
    set((state) => {
      const tileMap = new Map(state.tiles.map(t => [`${t.x},${t.y},${t.layer || 0}`, t]));
      newTiles.forEach(nt => {
        tileMap.set(`${nt.x},${nt.y},${nt.layer || 0}`, { ...nt, id: uuidv4() } as Tile);
      });
      return { tiles: Array.from(tileMap.values()) };
    });

    // Update chunks in Supabase
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
        tileData.push(newTile);
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

    // Determine what to remove: try PROP (layer 1) first, then GROUND (layer 0)
    const existingTilesAtPos = get().tiles.filter(t => t.x === x && t.y === y);
    const propTile = existingTilesAtPos.find(t => t.layer === 1);
    const groundTile = existingTilesAtPos.find(t => !t.layer || t.layer === 0);

    if (propTile) {
      targetLayer = 1;
      removedTile = propTile;
    } else if (groundTile) {
      targetLayer = 0;
      removedTile = groundTile;
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

  moveTile: async (tileId, newX, newY, newOffsetX, newOffsetY) => {
    const state = get();
    const tile = state.tiles.find(t => t.id === tileId);
    if (!tile) return;

    const oldX = tile.x;
    const oldY = tile.y;
    const layer = tile.layer || 0;

    // Update local state
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

    // Add to new chunk
    const { data: newChunk } = await supabase.from('map_chunks').select('tile_data').eq('chunk_x', newChunkX).eq('chunk_y', newChunkY).maybeSingle();
    let newTileData = newChunk?.tile_data || [];
    if (!Array.isArray(newTileData)) newTileData = [];
    
    // Ensure we don't duplicate if it moved within the same chunk (though removed above, filter to be safe)
    newTileData = newTileData.filter((t: any) => !(t.x === newX && t.y === newY && (t.layer || 0) === layer));
    newTileData.push({ 
      x: newX, 
      y: newY, 
      type: tile.type, 
      imageUrl: tile.imageUrl, 
      isSpritesheet: tile.isSpritesheet, 
      frameCount: tile.frameCount, 
      frameWidth: tile.frameWidth, 
      frameHeight: tile.frameHeight, 
      animationSpeed: tile.animationSpeed, 
      layer: layer, 
      offsetX: newOffsetX, 
      offsetY: newOffsetY,
      isWalkable: tile.isWalkable ?? true,
      snapToGrid: tile.snapToGrid ?? false,
      isAutoFill: tile.isAutoFill ?? true
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
