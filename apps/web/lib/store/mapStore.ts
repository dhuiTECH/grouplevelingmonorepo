'use client';
import { create } from 'zustand';

// Re-export all types so existing imports don't break
export * from './types';

// Import slice creators
import { createEditorSettingsSlice } from './slices/editorSettingsSlice';
import { createToolsSlice } from './slices/toolsSlice';
import { createSmartBrushSlice } from './slices/smartBrushSlice';
import { createHistorySlice } from './slices/historySlice';
import { createMapDataSlice } from './slices/mapDataSlice';

// Import the combined MapState type
import { MapState } from './types';

export const useTickStore = create<{ globalTick: number; incrementTick: () => void }>((set) => ({
  globalTick: 0,
  incrementTick: () => set((state) => ({ globalTick: (state.globalTick + 1) % 1000 })),
}));

// Combine all slices into a single store
export const useMapStore = create<MapState>()((...a) => ({
  ...createEditorSettingsSlice(...a),
  ...createToolsSlice(...a),
  ...createSmartBrushSlice(...a),
  ...createHistorySlice(...a),
  ...createMapDataSlice(...a),
}));
