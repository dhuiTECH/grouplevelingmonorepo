import { StateCreator } from 'zustand';
import { MapState, ToolsSlice } from '../types';

export const createToolsSlice: StateCreator<
  MapState,
  [],
  [],
  ToolsSlice
> = (set) => ({
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

  selectNode: (id) => set({ selectedNodeId: id, selectedTool: id ? 'node' : 'select' }),
  selectTile: (id) => set({ selectedTileId: id, selectedTool: id ? 'paint' : 'select' }),
  setDraggingTile: (id) => set({ isDraggingTile: !!id, draggingTileId: id }),
  setDraggingNode: (id) => set({ isDraggingNode: !!id, draggingNodeId: id }),
  setTool: (tool, nodeType) => set({ 
    selectedTool: tool, 
    activeNodeType: nodeType || null,
    // Clear selections when switching tools, unless switching between paint and select
    ...(tool !== 'paint' && tool !== 'select' ? { selectedTileId: null } : {}),
    ...(tool !== 'node' && tool !== 'select' ? { selectedNodeId: null } : {})
  }),
});
