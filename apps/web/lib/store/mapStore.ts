'use client';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

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
  
  addNode: (node: Omit<MapNode, 'id'>) => void;
  updateNode: (id: string, updates: Partial<MapNode>) => void;
  removeNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  selectTile: (id: string | null) => void;
  setTool: (tool: ToolType, nodeType?: NodeType | null) => void;
  addCustomTile: (tile: CustomTile) => void;
  updateCustomTile: (id: string, updates: Partial<CustomTile>) => void;
  setSpawnPoint: (x: number, y: number) => void;
  addTile: (tile: Tile) => void;
  addTileSimple: (x: number, y: number, type: string, imageUrl: string) => void;
  batchAddTiles: (newTiles: Omit<Tile, 'id'>[]) => void;
  removeTileAt: (x: number, y: number) => void;
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

  addNode: (node) => set((state) => ({ 
    nodes: [...state.nodes, { ...node, id: uuidv4() }] 
  })),

  updateNode: (id, updates) => set((state) => ({
    nodes: state.nodes.map((n) => n.id === id ? { ...n, ...updates } : n)
  })),

  removeNode: (id) => set((state) => ({
    nodes: state.nodes.filter((n) => n.id !== id),
    selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
  })),

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

  updateCustomTile: (id, updates) => set((state) => ({
    customTiles: state.customTiles.map(t => t.id === id ? { ...t, ...updates } : t)
  })),

  setSpawnPoint: (x, y) => set({ spawnPoint: { x, y } }),

  addTile: (tile) => set((state) => ({
    tiles: [...state.tiles.filter(t => t.x !== tile.x || t.y !== tile.y), tile]
  })),

  addTileSimple: (x, y, type, imageUrl) => set((state) => ({
      tiles: [...state.tiles.filter(t => t.x !== x || t.y !== y), {
          id: uuidv4(),
          x,
          y,
          type: type as any,
          imageUrl
      }]
  })),

  batchAddTiles: (newTiles) => set((state) => {
    const tileMap = new Map(state.tiles.map(t => [`${t.x},${t.y}`, t]));
    newTiles.forEach(nt => {
      tileMap.set(`${nt.x},${nt.y}`, { ...nt, id: uuidv4() } as Tile);
    });
    return { tiles: Array.from(tileMap.values()) };
  }),

  removeTileAt: (x, y) => set((state) => ({
    tiles: state.tiles.filter(t => t.x !== x || t.y !== y)
  })),

  exportMap: () => {
    const state = get();
    return JSON.stringify({
      version: '1.0.0',
      tiles: state.tiles,
      nodes: state.nodes,
      spawnPoint: state.spawnPoint
    }, null, 2);
  }
}));
