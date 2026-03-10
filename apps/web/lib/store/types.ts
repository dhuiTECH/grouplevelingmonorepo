import { StateCreator } from 'zustand';

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
  category?: 'water_base' | 'foam_strip' | 'tile' | 'prop' | 'road' | 'structure' | 'mountain' | 'big_structure' | 'poi';
  rotation?: number; // Default rotation
  sort_order?: number;
}

export type ToolType = 'select' | 'paint' | 'erase' | 'node' | 'stamp' | 'eyedropper' | 'rotate' | 'collision';

export interface LayerSetting {
  locked: boolean;
  hidden: boolean;
}

// Slice Interfaces
export interface EditorSettingsSlice {
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushMode: boolean;
  setBrushMode: (enabled: boolean) => void;
  snapMode: 'full' | 'half' | 'free';
  setSnapMode: (mode: 'full' | 'half' | 'free') => void;
  nodeSnapToGrid: boolean;
  setNodeSnapToGrid: (enabled: boolean) => void;
  sidebarWidth: number;
  rightSidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  layerSettings: Record<number, LayerSetting>;
  setLayerVisibility: (layer: number, visible: boolean) => void;
  setLayerLocked: (layer: number, locked: boolean) => void;
  showWalkabilityOverlay: boolean;
  setShowWalkabilityOverlay: (show: boolean) => void;
  showDebugModal: boolean;
  setShowDebugModal: (show: boolean) => void;
  showDebugNumbers: boolean;
  setShowDebugNumbers: (show: boolean) => void;
}

export interface ToolsSlice {
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
  favorites: (string | null)[];
  setFavorite: (index: number, tileId: string | null) => void;
  selection: { start: { x: number, y: number }, end: { x: number, y: number } } | null;
  currentStamp: Tile[] | null;
  setSelection: (selection: { start: { x: number, y: number }, end: { x: number, y: number } } | null) => void;
  setCurrentStamp: (stamp: Tile[] | null) => void;
  selectNode: (id: string | null) => void;
  selectTile: (id: string | null) => void;
  setDraggingTile: (id: string | null) => void;
  setDraggingNode: (id: string | null) => void;
  setTool: (tool: ToolType, nodeType?: NodeType | null) => void;
}

export interface SmartBrushSlice {
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
  setSelectedWaterBaseId: (id: string | null) => Promise<void>;
  setSelectedFoamStripId: (id: string | null) => Promise<void>;
  waterBaseTile: () => CustomTile | undefined;
  foamStripTile: () => CustomTile | undefined;
}

export interface UndoEntry {
  action: string;
  x?: number;
  y?: number;
  layer?: number;
  previousTile?: Tile | null;
  nodeData?: MapNode;
  previousFullTiles?: Tile[];
  addedTileId?: string;
  addedNodeId?: string;
  subActions?: UndoEntry[];
}

export interface HistorySlice {
  undoStack: UndoEntry[];
  setUndoStack: (updater: (prev: UndoEntry[]) => UndoEntry[]) => void;
  pushUndo: (action: UndoEntry) => void;
}

export interface MapDataSlice {
  tiles: Tile[];
  nodes: MapNode[];
  customTiles: CustomTile[];
  isLoadingTiles: boolean;
  spawnPoint: { x: number; y: number } | null;
  setTiles: (tiles: Tile[]) => void;
  setNodes: (nodes: MapNode[]) => void;
  setCustomTiles: (tiles: CustomTile[]) => void;
  loadTilesFromSupabase: () => Promise<void>;
  addNode: (node: Omit<MapNode, 'id'>) => Promise<string>;
  updateNode: (id: string, updates: Partial<MapNode>) => Promise<void>;
  removeNode: (id: string) => Promise<void>;
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
  updateTileAndNeighbors: (x: number, y: number, layer: number, isRemoving?: boolean, smartType?: string, blockCol?: number, blockRow?: number) => Promise<void>;
  batchUpdateTileAndNeighbors: (updates: { x: number, y: number, layer: number, isRemoving?: boolean, smartType?: string, blockCol?: number, blockRow?: number }[]) => Promise<void>;
  paintTiles: (newTiles: Tile[], tileIdsToRemove: string[], undoEntry: any, touchedChunks: string[], autoTileQueue: any[], nodeIdsToRemove?: string[]) => Promise<void>;
  forceSyncAllChunks: () => Promise<void>;
  syncChunks: (chunkKeys: string[]) => void;
  exportMap: () => string;
}

export type MapState = EditorSettingsSlice & ToolsSlice & SmartBrushSlice & HistorySlice & MapDataSlice;

export type MapSliceCreator<T> = StateCreator<
  MapState,
  [],
  [],
  T
>;
