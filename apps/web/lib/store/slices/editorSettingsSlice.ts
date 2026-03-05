import { StateCreator } from 'zustand';
import { MapState, EditorSettingsSlice } from '../types';

export const createEditorSettingsSlice: StateCreator<
  MapState,
  [],
  [],
  EditorSettingsSlice
> = (set) => ({
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

  // Walkability overlay state
  showWalkabilityOverlay: false,
  setShowWalkabilityOverlay: (showWalkabilityOverlay) => set({ showWalkabilityOverlay }),

  // Debug modal state
  showDebugModal: false,
  setShowDebugModal: (showDebugModal) => set({ showDebugModal }),
  showDebugNumbers: false,
  setShowDebugNumbers: (showDebugNumbers) => set({ showDebugNumbers }),
});
