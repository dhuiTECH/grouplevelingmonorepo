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
  type: 'urban' | 'nature' | 'water' | 'grassland' | 'hill' | 'soil' | string;
}

export interface CustomTile {
  id: string;
  url: string;
  name: string;
  type?: 'grassland' | 'water' | 'hill' | 'soil' | string;
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
  setTool: (tool: ToolType, nodeType?: NodeType | null) => void;
  addCustomTile: (tile: CustomTile) => void;
  removeCustomTile: (id: string) => void;
  updateCustomTile: (id: string, updates: Partial<CustomTile>) => void;
  setSpawnPoint: (x: number, y: number) => void;
  addTile: (tile: Tile) => void;
  addTileSimple: (x: number, y: number, type: string, imageUrl: string) => Promise<void>;
  batchAddTiles: (newTiles: Omit<Tile, 'id'>[]) => Promise<void>;
  removeTileAt: (x: number, y: number) => Promise<void>;
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
              type: t.type
            });
          });
        }
      });
      set({ tiles: allTiles });
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

  setTool: (tool, nodeType = null) => set({ 
    selectedTool: tool, 
    activeNodeType: nodeType,
    selectedNodeId: null,
    selectedTileId: tool === 'paint' ? get().selectedTileId : null
  }),

  addCustomTile: (tile) => set((state) => ({
    customTiles: [...state.customTiles, tile]
  })),

  removeCustomTile: (id) => set((state) => ({
    customTiles: state.customTiles.filter(t => t.id !== id),
    selectedTileId: state.selectedTileId === id ? null : state.selectedTileId
  })),

  updateCustomTile: (id, updates) => set((state) => ({
    customTiles: state.customTiles.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  setSpawnPoint: (x, y) => set({ spawnPoint: { x, y } }),

  addTile: (tile) => set((state) => ({
    tiles: [...state.tiles.filter(t => t.x !== tile.x || t.y !== tile.y), tile]
  })),

  addTileSimple: async (x, y, type, imageUrl) => {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);

    set((state) => ({
      tiles: [...state.tiles.filter(t => t.x !== x || t.y !== y), {
        id: uuidv4(),
        x,
        y,
        type,
        imageUrl
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
    
    // Remove existing tile at this pos within chunk data
    newTileData = newTileData.filter((t: any) => t.x !== x || t.y !== y);
    // Add new tile
    newTileData.push({ x, y, type, imageUrl });

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
      const tileMap = new Map(state.tiles.map(t => [`${t.x},${t.y}`, t]));
      newTiles.forEach(nt => {
        tileMap.set(`${nt.x},${nt.y}`, { ...nt, id: uuidv4() } as Tile);
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
        tileData = tileData.filter((t: any) => t.x !== newTile.x || t.y !== newTile.y);
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

    set((state) => ({
      tiles: state.tiles.filter(t => t.x !== x || t.y !== y)
    }));

    const { data: existingChunk } = await supabase
      .from('map_chunks')
      .select('tile_data')
      .eq('chunk_x', chunkX)
      .eq('chunk_y', chunkY)
      .maybeSingle();

    if (existingChunk?.tile_data) {
      const newTileData = existingChunk.tile_data.filter((t: any) => t.x !== x || t.y !== y);
      await supabase.from('map_chunks').upsert({
        chunk_x: chunkX,
        chunk_y: chunkY,
        tile_data: newTileData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'chunk_x,chunk_y' });
    }
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
